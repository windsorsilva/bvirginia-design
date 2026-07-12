/**
 * B Virgínia Design - Shared Scheduling Engine (shared.js)
 * Contém a lógica de cálculo de horários livres, durações e bloqueios.
 * Requer o arquivo db.js importado previamente no HTML.
 */

const SharedEngine = {
    // Converter "10:30" em minutos desde meia-noite (ex: 630)
    timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    },

    // Converter minutos desde meia-noite em "HH:MM" (ex: 630 -> "10:30")
    minutesToTime(mins) {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    },

    // Gerar um UUID robusto para identificação única
    generateUUID() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // ==========================================
    // PREVENÇÃO DE RESERVAS FANTASMAS (EXPIRAÇÃO)
    // ==========================================
    cleanupExpiredBookings() {
        const bookings = DB.getBookings();
        const tenMinutes = 10 * 60 * 1000; // 10 minutos em milissegundos
        const now = Date.now();

        const updatedBookings = bookings.filter(booking => {
            if (booking.status === 'Temporario') {
                const age = now - booking.createdAt;
                if (age > tenMinutes) {
                    console.log(`[Agenda] Expirando reserva temporária de ${booking.clientName} às ${booking.time} do dia ${booking.date}`);
                    return false; // Remove da lista (expira)
                }
            }
            return true;
        });

        if (bookings.length !== updatedBookings.length) {
            DB.saveBookings(updatedBookings);
        }
    },

    // ==========================================
    // CÁLCULO DE DISPONIBILIDADE DE HORÁRIOS
    // ==========================================
    getAvailableSlots(dateString, serviceName) {
        // Limpar reservas temporárias expiradas antes de calcular
        this.cleanupExpiredBookings();

        const settings = DB.getSettings();
        const bookings = DB.getBookings();
        const blockings = DB.getBlockings();
        const services = DB.getServices();

        // 1. Verificar se o dia da semana está ativo (Terça a Sábado)
        const dateObj = new Date(dateString + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0=Domingo, 1=Segunda, etc.
        
        if (!settings.workDays.includes(dayOfWeek)) {
            return { closed: true, reason: 'day', message: 'Estúdio fechado neste dia da semana.' };
        }

        // 2. Obter duração do serviço selecionado
        const selectedService = services.find(s => s.name === serviceName);
        const serviceDuration = selectedService ? selectedService.duration : 30; // padrão 30m
        const buffer = settings.bufferTime || 10; // tempo de limpeza (padrão 10m)
        const totalServiceTime = serviceDuration + buffer; // tempo total bloqueado do slot

        // 3. Obter limites do expediente em minutos
        const startMins = this.timeToMinutes(settings.startTime);       // ex: 10:00 -> 600m
        const endLimitMins = this.timeToMinutes(settings.lastStartLimit); // ex: 19:00 -> 1140m
        const closingMins = this.timeToMinutes(settings.closingTime);     // ex: 21:00 -> 1260m

        // 4. Filtrar agendamentos ocupados no dia
        // Considera agendamentos Confirmados, Pendentes e Temporários válidos
        const dayReservations = bookings.filter(b => 
            b.date === dateString && 
            (b.status === 'Confirmado' || b.status === 'Pendente' || b.status === 'Temporario')
        );

        // 5. Filtrar bloqueios manuais cadastrados no dia
        const dayBlockings = blockings.filter(block => block.date === dateString);

        const slots = [];

        // 6. Gerar slots a cada 30 minutos
        for (let currentMins = startMins; currentMins <= endLimitMins; currentMins += 30) {
            const timeStr = this.minutesToTime(currentMins);

            // Regra A: O atendimento cabe dentro do horário limite de fechamento?
            if (currentMins + serviceDuration > closingMins) {
                // Se o atendimento ultrapassa o horário de fechamento, o slot é indisponível
                slots.push({ time: timeStr, available: false, reason: 'closing', label: 'Indisponível' });
                continue;
            }

            // Regra B: O slot coincide com o horário de almoço/bloqueio fixo?
            if (settings.lunchBlocks.includes(timeStr)) {
                slots.push({ time: timeStr, available: false, reason: 'lunch', label: 'Horário de Almoço' });
                continue;
            }

            // Regra C: O slot colide com algum agendamento existente (considerando duração + buffer)?
            let isOverlapping = false;
            let overlappingBookingName = '';

            for (const res of dayReservations) {
                const resStart = this.timeToMinutes(res.time);
                // Duração do serviço cadastrado + buffer do sistema
                const resDuration = res.duration + buffer;
                const resEnd = resStart + resDuration;

                const newStart = currentMins;
                const newEnd = currentMins + totalServiceTime;

                // Condição de intersecção de intervalos: [newStart, newEnd] colide com [resStart, resEnd]?
                if (newStart < resEnd && newEnd > resStart) {
                    isOverlapping = true;
                    overlappingBookingName = res.clientName;
                    break;
                }
            }

            if (isOverlapping) {
                slots.push({ time: timeStr, available: false, reason: 'booking', client: overlappingBookingName, label: 'Ocupado' });
                continue;
            }

            // Regra D: O slot colide com algum bloqueio manual da administradora?
            let isBlockedManually = false;
            let blockReason = '';

            for (const block of dayBlockings) {
                const bStart = this.timeToMinutes(block.startTime);
                const bEnd = this.timeToMinutes(block.endTime);

                const newStart = currentMins;
                const newEnd = currentMins + totalServiceTime;

                if (newStart < bEnd && newEnd > bStart) {
                    isBlockedManually = true;
                    blockReason = block.reason;
                    break;
                }
            }

            if (isBlockedManually) {
                slots.push({ time: timeStr, available: false, reason: 'block', label: blockReason || 'Bloqueado' });
                continue;
            }

            // Se passou em todas as regras, o slot está livre!
            slots.push({ time: timeStr, available: true, label: 'Livre' });
        }

        return { closed: false, slots: slots };
    }
};
