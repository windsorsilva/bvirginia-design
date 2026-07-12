/**
 * B Virgínia Design - Administrative Controller (admin.js)
 * Controla a autenticação, navegação de abas, folha diária, CRM, fluxo financeiro, CMS e backups.
 * Requer db.js e shared.js importados previamente no HTML.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 0. AUTENTICAÇÃO E LOGIN GATE
    // ==========================================
    const loginScreen = document.getElementById('login-screen');
    const adminDashboard = document.getElementById('admin-dashboard-panel');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    const ADMIN_PASSWORD = 'virginia123';

    if (sessionStorage.getItem('bvirginia_auth') === 'true') {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const typedPassword = document.getElementById('admin-password').value;
        if (typedPassword === ADMIN_PASSWORD) {
            sessionStorage.setItem('bvirginia_auth', 'true');
            loginError.style.display = 'none';
            document.getElementById('admin-password').value = '';
            showDashboard();
        } else {
            loginError.style.display = 'block';
            document.getElementById('admin-password').select();
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('bvirginia_auth');
        hideDashboard();
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        adminDashboard.style.display = 'block';
        document.body.style.backgroundColor = '#ffffff';
        initAdminPanel();
    }

    function hideDashboard() {
        loginScreen.style.display = 'block';
        adminDashboard.style.display = 'none';
        document.body.style.backgroundColor = 'var(--color-nude-light)';
    }


    // ==========================================
    // 1. INICIALIZAÇÃO DO CONTROLLER DO PAINEL
    // ==========================================
    let currentSelectedDate = new Date().toISOString().split('T')[0];
    let calendarCurrentMonth = new Date().getMonth();
    let calendarCurrentYear = new Date().getFullYear();

    // Elementos DOM
    const displayDateTitle = document.getElementById('display-date-title');
    const dailySlotsSheet = document.getElementById('daily-slots-sheet');
    const selectedDateInput = document.getElementById('selected-date-input');
    const monthYearTitle = document.getElementById('month-year-title');
    const monthCalendarGrid = document.getElementById('month-calendar-grid');

    // Modal Reserva
    const reserveModal = document.getElementById('reserve-modal');
    const reserveForm = document.getElementById('reserve-form');
    const displayReserveDate = document.getElementById('display-reserve-date');
    const displayReserveTime = document.getElementById('display-reserve-time');
    const reserveTimeField = document.getElementById('reserve-time');
    const reserveServiceSelect = document.getElementById('reserve-service');

    // Modal Sugestão
    const suggestModal = document.getElementById('suggest-modal');
    const suggestForm = document.getElementById('suggest-form');
    const closeSuggestBtn = document.getElementById('close-suggest-btn');

    // Modal Serviço
    const serviceModal = document.getElementById('service-modal');
    const serviceForm = document.getElementById('service-form');

    function initAdminPanel() {
        // Limpar agendamentos temporários antigos ao iniciar
        SharedEngine.cleanupExpiredBookings();

        // Setup de data mínima e atual no input de busca rápida
        selectedDateInput.value = currentSelectedDate;
        selectedDateInput.addEventListener('change', (e) => {
            currentSelectedDate = e.target.value;
            const d = new Date(currentSelectedDate + 'T00:00:00');
            calendarCurrentMonth = d.getMonth();
            calendarCurrentYear = d.getFullYear();
            updateCalendarAndSlots();
        });

        // Abas de Navegação Principal
        document.querySelectorAll('.tab-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-link-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                const targetTab = btn.getAttribute('data-tab-id');
                document.getElementById(targetTab).classList.add('active');
                
                // Atualização sob demanda das abas
                if (targetTab === 'agenda-tab') updateCalendarAndSlots();
                if (targetTab === 'clientes-tab') renderCRM();
                if (targetTab === 'financeiro-tab') renderFinance();
                if (targetTab === 'bloqueios-tab') renderBlockings();
                if (targetTab === 'config-tab') initConfigTab();
            });
        });

        // Abas Secundárias de Configuração (CMS / Horas)
        document.querySelectorAll('.config-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.config-subtab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.config-subtab-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(btn.getAttribute('data-subtab-id')).classList.add('active');
            });
        });

        // Controles de data do Calendário Mensal
        document.getElementById('prev-month-btn').addEventListener('click', () => {
            calendarCurrentMonth--;
            if (calendarCurrentMonth < 0) {
                calendarCurrentMonth = 11;
                calendarCurrentYear--;
            }
            renderMonthCalendar();
        });
        document.getElementById('next-month-btn').addEventListener('click', () => {
            calendarCurrentMonth++;
            if (calendarCurrentMonth > 11) {
                calendarCurrentMonth = 0;
                calendarCurrentYear++;
            }
            renderMonthCalendar();
        });

        // Submissão do add bloqueio manual
        document.getElementById('add-blocking-form').addEventListener('submit', handleAddBlocking);

        // Setup inicial
        updateCalendarAndSlots();
        populateServicesDropdowns();
    }

    function updateCalendarAndSlots() {
        renderMonthCalendar();
        renderDailySlotsSheet();
    }

    function populateServicesDropdowns() {
        const services = DB.getServices();
        reserveServiceSelect.innerHTML = '';
        services.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.innerText = `${s.name} (R$ ${s.price.toFixed(2)} - ${srvDurationText(s.duration)})`;
            reserveServiceSelect.appendChild(opt);
        });
    }

    function srvDurationText(mins) {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m === 0 ? `${h}h` : `${h}h${m}m`;
    }

    // ==========================================
    // 2. CALENDÁRIO MENSAL INTERATIVO
    // ==========================================
    function renderMonthCalendar() {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        monthYearTitle.innerText = `${months[calendarCurrentMonth]} de ${calendarCurrentYear}`;

        monthCalendarGrid.innerHTML = `
            <span class="month-day-lbl">Dom</span>
            <span class="month-day-lbl">Seg</span>
            <span class="month-day-lbl">Ter</span>
            <span class="month-day-lbl">Qua</span>
            <span class="month-day-lbl">Qui</span>
            <span class="month-day-lbl">Sex</span>
            <span class="month-day-lbl">Sáb</span>
        `;

        // Obter dias do mês anterior para preenchimento
        const firstDayIndex = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
        const totalDays = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();
        const prevTotalDays = new Date(calendarCurrentYear, calendarCurrentMonth, 0).getDate();

        const settings = DB.getSettings();
        const bookings = DB.getBookings();

        // 1. Dias do mês anterior (inativos)
        for (let i = firstDayIndex; i > 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'month-day-cell inactive';
            cell.innerHTML = `<span class="day-cell-num">${prevTotalDays - i + 1}</span>`;
            monthCalendarGrid.appendChild(cell);
        }

        // 2. Dias do mês atual
        for (let day = 1; day <= totalDays; day++) {
            const cellDateStr = `${calendarCurrentYear}-${(calendarCurrentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const cell = document.createElement('div');
            cell.className = 'month-day-cell';
            
            const dateObj = new Date(cellDateStr + 'T00:00:00');
            const dayOfWeek = dateObj.getDay();

            // Marcar dias inativos de funcionamento
            if (!settings.workDays.includes(dayOfWeek)) {
                cell.classList.add('closed-day');
            }

            if (cellDateStr === currentSelectedDate) {
                cell.classList.add('selected');
            }

            // Obter agendamentos Confirmados e Pendentes para renderizar bolinhas
            const dayBookings = bookings.filter(b => b.date === cellDateStr && (b.status === 'Confirmado' || b.status === 'Pendente'));

            let dotsHtml = '';
            if (dayBookings.length > 0) {
                dotsHtml = '<div class="day-dots">';
                dayBookings.slice(0, 3).forEach(b => {
                    const dotClass = b.status === 'Confirmado' ? 'confirmed' : 'pending';
                    dotsHtml += `<span class="day-dot ${dotClass}"></span>`;
                });
                dotsHtml += '</div>';
            }

            cell.innerHTML = `
                <span class="day-cell-num">${day}</span>
                ${dotsHtml}
            `;

            // Clique na célula
            if (settings.workDays.includes(dayOfWeek)) {
                cell.addEventListener('click', () => {
                    currentSelectedDate = cellDateStr;
                    selectedDateInput.value = cellDateStr;
                    updateCalendarAndSlots();
                });
            }

            monthCalendarGrid.appendChild(cell);
        }
    }

    // ==========================================
    // 3. RENDERIZAR FOLHA DIÁRIA (SLOTS)
    // ==========================================
    function renderDailySlotsSheet() {
        dailySlotsSheet.innerHTML = '';
        const date = currentSelectedDate;

        // Formatar título do cabeçalho da folha
        const parts = date.split('-');
        displayDateTitle.innerText = `Agenda: Folha Diária de ${parts[2]}/${parts[1]}/${parts[0]}`;

        // Verificar se o dia está configurado como fechado
        const settings = DB.getSettings();
        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        if (!settings.workDays.includes(dayOfWeek)) {
            dailySlotsSheet.innerHTML = `<div style="text-align: center; color: #b91c1c; padding: 3rem; font-weight: 500;">Estúdio fechado neste dia da semana.</div>`;
            return;
        }

        // Chamar o SharedEngine para calcular os horários livres e ocupados
        // Para a visualização administrativa, usamos uma duração básica de 30m para ver a grade de 30m
        const result = SharedEngine.getAvailableSlots(date, 'Design simples');

        if (result.closed) {
            dailySlotsSheet.innerHTML = `<div style="text-align: center; color: #b91c1c; padding: 3rem; font-weight: 500;">${result.message}</div>`;
            return;
        }

        const bookings = DB.getBookings();
        const dayBookings = bookings.filter(b => b.date === date && (b.status === 'Confirmado' || b.status === 'Pendente' || b.status === 'Temporario'));
        
        // Mapeamento de horários diretos de agendamentos
        const directBookings = {};
        dayBookings.forEach(b => {
            directBookings[b.time] = b;
        });

        // Para cada slot gerado pelo engine:
        result.slots.forEach(slot => {
            const card = document.createElement('div');
            card.className = 'admin-slot-card';

            const direct = directBookings[slot.time];

            if (slot.available) {
                // Livre
                card.classList.add('disponivel');
                card.innerHTML = `
                    <div class="slot-time-box">
                        <span class="admin-slot-time-text">${slot.time}</span>
                        <span class="slot-badge badge-disponivel">Disponível</span>
                        <span class="slot-details-text" style="color: var(--color-text-muted); font-style: italic;">Livre para novos agendamentos</span>
                    </div>
                    <div class="slot-actions">
                        <button class="btn-slot-action btn-slot-reserve" onclick="openReserveModal('${date}', '${slot.time}')">Reservar</button>
                    </div>
                `;
            } else {
                // Ocupado ou bloqueado
                if (direct) {
                    // Reserva direta que inicia neste horário
                    card.classList.add('reservado');
                    
                    const isPendente = direct.status === 'Pendente';
                    const isTemp = direct.status === 'Temporario';
                    
                    let badgeClass = 'badge-reservado';
                    let statusText = 'Confirmado';
                    
                    if (isPendente) {
                        badgeClass = 'badge-pendente';
                        statusText = 'Pendente / Confirmar';
                    } else if (isTemp) {
                        badgeClass = 'badge-temporario';
                        statusText = 'Reserva Temporária (10m)';
                    }

                    // Identificar origem da reserva se cadastrada
                    const displayOrigin = direct.origin ? ` <small style="color: #666; font-style: italic;">(Via ${direct.origin})</small>` : '';

                    // Botão confirmar só aparece se pendente
                    const confirmBtnHtml = isPendente 
                        ? `<button class="btn-slot-action btn-slot-reserve" onclick="confirmBooking('${direct.id}')" style="color: #1e40af; border-color: #3b82f6;">Confirmar</button>`
                        : '';

                    card.innerHTML = `
                        <div class="slot-time-box">
                            <span class="admin-slot-time-text">${slot.time}</span>
                            <span class="slot-badge ${badgeClass}">${statusText}</span>
                            <span class="slot-details-text">
                                <strong>${direct.clientName}</strong>${displayOrigin} — ${direct.service} 
                                ${direct.clientPhone ? `<br><small style="color:var(--color-gold-dark);">WhatsApp: ${direct.clientPhone}</small>` : ''}
                            </span>
                        </div>
                        <div class="slot-actions">
                            ${confirmBtnHtml}
                            <button class="btn-slot-action btn-slot-release" onclick="releaseBooking('${direct.id}')">Liberar</button>
                            <button class="btn-slot-action btn-slot-msg" onclick="openSuggestModal('${date}', '${slot.time}', '${direct.clientName}', '${direct.clientPhone}')">Rejeitar / Sugerir Outro</button>
                        </div>
                    `;
                } else {
                    // Bloqueio por tempo de execução do serviço anterior ou bloqueio manual
                    card.classList.add('bloqueado');
                    
                    if (slot.reason === 'lunch') {
                        card.innerHTML = `
                            <div class="slot-time-box">
                                <span class="admin-slot-time-text" style="color:#78716c;">${slot.time}</span>
                                <span class="slot-badge badge-bloqueado">Almoço</span>
                                <span class="slot-details-text" style="color:#78716c; font-style:italic;">Intervalo / Almoço</span>
                            </div>
                            <div class="slot-actions">
                                <span style="font-size:0.75rem; color:#78716c;">Fixo do expediente</span>
                            </div>
                        `;
                    } else if (slot.reason === 'block') {
                        card.innerHTML = `
                            <div class="slot-time-box">
                                <span class="admin-slot-time-text" style="color:#b91c1c;">${slot.time}</span>
                                <span class="slot-badge badge-bloqueado" style="background-color:#fee2e2; color:#b91c1c;">Bloqueado</span>
                                <span class="slot-details-text" style="color:#b91c1c;"><strong>Bloqueio Manual:</strong> ${slot.label}</span>
                            </div>
                            <div class="slot-actions">
                                <button class="btn-slot-action btn-slot-release" onclick="removeManualBlock('${date}', '${slot.time}')">Desbloquear</button>
                            </div>
                        `;
                    } else {
                        // Em andamento
                        card.innerHTML = `
                            <div class="slot-time-box">
                                <span class="admin-slot-time-text" style="color:#78716c;">${slot.time}</span>
                                <span class="slot-badge badge-bloqueado">Em Andamento</span>
                                <span class="slot-details-text" style="color:#78716c; font-style:italic;">Serviço anterior em andamento (+ limpeza)</span>
                            </div>
                            <div class="slot-actions">
                                <span style="font-size:0.75rem; color:#78716c;">(Ocupado)</span>
                            </div>
                        `;
                    }
                }
            }

            dailySlotsSheet.appendChild(card);
        });
    }

    // Ações globais vinculadas a window para chamada nos cliques do HTML dinâmico
    window.confirmBooking = (id) => {
        const bookings = DB.getBookings();
        const booking = bookings.find(b => b.id === id);
        if (booking) {
            booking.status = 'Confirmado';
            DB.saveBookings(bookings);
            updateCalendarAndSlots();
            linkCustomerHistory(booking.clientName, booking.clientPhone, booking.id);
        }
    };

    window.releaseBooking = (id) => {
        if (confirm('Tem certeza que deseja excluir / liberar este agendamento?')) {
            const bookings = DB.getBookings();
            const booking = bookings.find(b => b.id === id);
            const updated = bookings.filter(b => b.id !== id);
            DB.saveBookings(updated);
            updateCalendarAndSlots();
            
            if (booking) {
                const customers = DB.getCustomers();
                const customer = customers.find(c => c.phone.replace(/\D/g, '') === booking.clientPhone.replace(/\D/g, ''));
                if (customer) {
                    customer.history = customer.history.filter(histId => histId !== id);
                    DB.saveCustomers(customers);
                }
            }
        }
    };

    window.removeManualBlock = (date, time) => {
        if (confirm('Desbloquear este horário?')) {
            let blockings = DB.getBlockings();
            blockings = blockings.filter(b => !(b.date === date && time >= b.startTime && time < b.endTime));
            DB.saveBlockings(blockings);
            updateCalendarAndSlots();
        }
    };

    function linkCustomerHistory(name, phone, bookingId) {
        const customers = DB.getCustomers();
        const cleanPhone = phone.replace(/\D/g, '');
        let customer = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);
        if (customer) {
            if (!customer.history.includes(bookingId)) {
                customer.history.push(bookingId);
                DB.saveCustomers(customers);
            }
        }
    }


    // ==========================================
    // 4. RESERVA DIRETAMENTE PELO ADMIN (ORIGIN: ADMIN)
    // ==========================================
    window.openReserveModal = (dateStr, timeStr) => {
        document.getElementById('reserve-time').value = timeStr;
        displayReserveTime.value = timeStr;
        
        const parts = dateStr.split('-');
        displayReserveDate.value = `${parts[2]}/${parts[1]}/${parts[0]}`;
        
        document.getElementById('reserve-name').value = '';
        document.getElementById('reserve-phone').value = '';
        
        reserveModal.classList.add('active');
    };

    document.getElementById('close-reserve-btn').addEventListener('click', () => {
        reserveModal.classList.remove('active');
    });

    reserveForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const date = currentSelectedDate;
        const time = document.getElementById('reserve-time').value;
        const name = document.getElementById('reserve-name').value.trim();
        const phone = document.getElementById('reserve-phone').value.trim();
        const service = document.getElementById('reserve-service').value;
        const payStatus = document.getElementById('reserve-payment-status').value;
        const payMethod = document.getElementById('reserve-payment-method').value;

        const services = DB.getServices();
        const srv = services.find(s => s.name === service);
        const price = srv ? srv.price : 0;
        const duration = srv ? srv.duration : 30;

        // Gerar UUID robusto
        const newRes = {
            id: SharedEngine.generateUUID(),
            date: date,
            time: time,
            clientName: name,
            clientPhone: phone,
            service: service,
            price: price,
            duration: duration,
            paymentStatus: payStatus,
            paymentMethod: payMethod,
            status: 'Confirmado',
            origin: 'Admin', // Origem: inserido manualmente pela esteticista
            createdAt: Date.now(),
            notes: 'Reserva manual do estúdio'
        };

        const bookings = DB.getBookings();
        bookings.push(newRes);
        DB.saveBookings(bookings);

        // Criar/atualizar CRM
        const customers = DB.getCustomers();
        const cleanPhone = phone.replace(/\D/g, '');
        let customer = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);

        if (!customer) {
            customer = {
                id: SharedEngine.generateUUID(),
                name: name,
                phone: phone,
                history: [newRes.id]
            };
            customers.push(customer);
        } else {
            customer.history.push(newRes.id);
        }
        DB.saveCustomers(customers);

        reserveModal.classList.remove('active');
        updateCalendarAndSlots();
    });


    // ==========================================
    // 5. MODAL DE SUGERIR OUTRO HORÁRIO
    // ==========================================
    window.openSuggestModal = (dateStr, timeStr, clientName, clientPhone) => {
        document.getElementById('suggest-original-date').value = dateStr;
        document.getElementById('suggest-original-time').value = timeStr;
        document.getElementById('suggest-client-name').value = clientName;
        document.getElementById('display-suggest-client').value = `${clientName} (Horário original: ${timeStr})`;
        
        const cleanPhone = clientPhone.replace(/\D/g, '');
        document.getElementById('suggest-phone').value = cleanPhone;

        document.getElementById('suggest-new-date').value = dateStr;
        document.getElementById('suggest-new-time').value = '';

        suggestModal.classList.add('active');
    };

    document.getElementById('close-suggest-btn').addEventListener('click', () => {
        suggestModal.classList.remove('active');
    });

    suggestForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const clientName = document.getElementById('suggest-client-name').value;
        const rawPhone = document.getElementById('suggest-phone').value.trim();
        const newDate = document.getElementById('suggest-new-date').value;
        const newTime = document.getElementById('suggest-new-time').value;

        const dateParts = newDate.split('-');
        const formattedNewDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
            cleanPhone = '55' + cleanPhone;
        } else if (cleanPhone.length === 9) {
            cleanPhone = '5581' + cleanPhone;
        }

        const message = `Olá, ${clientName}! Infelizmente não tenho esse horário disponível. Tenho disponível o horário de ${newTime} no dia ${formattedNewDate}. Podemos agendar?`;
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank', 'noopener,noreferrer');
        suggestModal.classList.remove('active');
    });


    // ==========================================
    // 6. ABA 2: CLIENTES (CRM)
    // ==========================================
    const crmSearch = document.getElementById('crm-search');
    const crmCustomersGrid = document.getElementById('crm-customers-grid');

    if (crmSearch) {
        crmSearch.addEventListener('input', renderCRM);
    }

    function renderCRM() {
        const customers = DB.getCustomers();
        const bookings = DB.getBookings();
        const search = crmSearch.value.trim().toLowerCase();

        crmCustomersGrid.innerHTML = '';

        const filtered = customers.filter(c => 
            c.name.toLowerCase().includes(search) || 
            c.phone.replace(/\D/g, '').includes(search)
        );

        if (filtered.length === 0) {
            crmCustomersGrid.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--color-text-muted); padding: 2rem;">Nenhum cliente cadastrado ou correspondente à busca.</div>`;
            return;
        }

        filtered.forEach(cust => {
            const custBookings = bookings.filter(b => cust.history.includes(b.id));

            const totalSpent = custBookings
                .filter(b => b.paymentStatus === 'Pago')
                .reduce((sum, b) => sum + b.price, 0);

            let lastServiceText = 'Nenhum confirmado ainda';
            let lastDateText = 'N/A';
            
            const confirmedBookings = custBookings.filter(b => b.status === 'Confirmado');
            if (confirmedBookings.length > 0) {
                confirmedBookings.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
                const lastB = confirmedBookings[0];
                const dateParts = lastB.date.split('-');
                lastDateText = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                lastServiceText = `${lastB.service} (${lastDateText})`;
            }

            let historyHtml = '';
            if (custBookings.length > 0) {
                historyHtml = '<div class="customer-history-box">';
                custBookings.forEach(b => {
                    const dateParts = b.date.split('-');
                    const dStr = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                    historyHtml += `
                        <div class="customer-history-item">
                            📅 ${dStr} às ${b.time} — <strong>${b.service}</strong> (R$ ${b.price.toFixed(2)}) — <span class="badge-status ${b.paymentStatus === 'Pago' ? 'badge-pago' : 'badge-pendente-financeiro'}">${b.paymentStatus}</span>
                        </div>
                    `;
                });
                historyHtml += '</div>';
            } else {
                historyHtml = '<p style="font-size:0.8rem; color:var(--color-text-muted); margin-top: 1rem; font-style:italic;">Sem histórico registrado.</p>';
            }

            const card = document.createElement('div');
            card.className = 'customer-detail-card';
            card.innerHTML = `
                <h4 class="customer-name">${cust.name}</h4>
                <span class="customer-phone">📱 WhatsApp: ${cust.phone}</span>
                
                <p style="font-size: 0.8rem; color: var(--color-text-muted);">
                    <strong>Último Atendimento:</strong> ${lastServiceText}
                </p>

                <div class="customer-stats">
                    <div class="cust-stat">
                        <span class="cust-stat-val">R$ ${totalSpent.toFixed(2)}</span>
                        <span class="cust-stat-lbl">Gasto Confirmado</span>
                    </div>
                    <div class="cust-stat">
                        <span class="cust-stat-val">${custBookings.length}</span>
                        <span class="cust-stat-lbl">Agendamentos Totais</span>
                    </div>
                </div>

                ${historyHtml}
            `;
            crmCustomersGrid.appendChild(card);
        });
    }


    // ==========================================
    // 7. ABA 3: FINANCEIRO (RECEITA E TRANSAÇÕES)
    // ==========================================
    const financeTableBody = document.getElementById('finance-table-body');

    function renderFinance() {
        const bookings = DB.getBookings();
        bookings.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

        financeTableBody.innerHTML = '';

        let countToday = 0;
        let countMonth = 0;
        let countPending = 0;

        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonthStr = todayStr.substring(0, 7);

        bookings.forEach(b => {
            if (b.status === 'Confirmado') {
                if (b.paymentStatus === 'Pago') {
                    if (b.date === todayStr) {
                        countToday += b.price;
                    }
                    if (b.date.startsWith(currentMonthStr)) {
                        countMonth += b.price;
                    }
                } else if (b.paymentStatus === 'Pendente') {
                    countPending += b.price;
                }
            }

            const dateParts = b.date.split('-');
            const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const row = document.createElement('tr');
            
            let actionHtml = '';
            if (b.paymentStatus === 'Pendente' && b.status === 'Confirmado') {
                actionHtml = `<button class="btn-slot-action btn-slot-reserve" onclick="payBooking('${b.id}')">Marcar Pago</button>`;
            } else {
                actionHtml = `<span style="font-size:0.8rem; color:#854d0e; font-weight:600;">—</span>`;
            }

            row.innerHTML = `
                <td><strong>${displayDate}</strong> às ${b.time}</td>
                <td>${b.clientName}</td>
                <td>${b.service}</td>
                <td><strong>R$ ${b.price.toFixed(2)}</strong></td>
                <td>${b.paymentMethod || 'Não Definido'}</td>
                <td><span class="badge-status ${b.paymentStatus === 'Pago' ? 'badge-pago' : 'badge-pendente-financeiro'}">${b.paymentStatus}</span></td>
                <td style="text-align: right;">${actionHtml}</td>
            `;
            financeTableBody.appendChild(row);
        });

        if (bookings.length === 0) {
            financeTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color:var(--color-text-muted);">Nenhuma transação financeira registrada.</td></tr>`;
        }

        document.getElementById('revenue-today').innerText = `R$ ${countToday.toFixed(2)}`;
        document.getElementById('revenue-month').innerText = `R$ ${countMonth.toFixed(2)}`;
        document.getElementById('revenue-pending').innerText = `R$ ${countPending.toFixed(2)}`;
    }

    window.payBooking = (id) => {
        const bookings = DB.getBookings();
        const booking = bookings.find(b => b.id === id);
        if (booking) {
            booking.paymentStatus = 'Pago';
            const method = prompt('Qual a forma de pagamento? (Digite PIX, Dinheiro ou Cartão)', 'PIX');
            if (method) {
                booking.paymentMethod = method;
            }
            DB.saveBookings(bookings);
            renderFinance();
        }
    };


    // ==========================================
    // 8. ABA 4: BLOQUEIOS MANUAIS
    // ==========================================
    const blockingsTableBody = document.getElementById('blockings-table-body');
    
    function renderBlockings() {
        const blockings = DB.getBlockings();
        blockingsTableBody.innerHTML = '';

        blockings.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

        blockings.forEach(block => {
            const dateParts = block.date.split('-');
            const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${displayDate}</strong></td>
                <td>De ${block.startTime} até ${block.endTime}</td>
                <td>${block.reason}</td>
                <td style="text-align: right;">
                    <button class="btn-slot-action btn-slot-release" onclick="deleteManualBlock('${block.id}')">Excluir</button>
                </td>
            `;
            blockingsTableBody.appendChild(row);
        });

        if (blockings.length === 0) {
            blockingsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--color-text-muted);">Nenhum bloqueio cadastrado.</td></tr>`;
        }
        
        document.getElementById('block-date').value = currentSelectedDate;
        document.getElementById('block-date').setAttribute('min', new Date().toISOString().split('T')[0]);
    }

    function handleAddBlocking(e) {
        e.preventDefault();

        const date = document.getElementById('block-date').value;
        const start = document.getElementById('block-start').value;
        const end = document.getElementById('block-end').value;
        const reason = document.getElementById('block-reason').value;

        if (start >= end) {
            alert('A hora de início deve ser menor que a hora de término.');
            return;
        }

        const blockings = DB.getBlockings();
        const newBlock = {
            id: SharedEngine.generateUUID(),
            date: date,
            startTime: start,
            endTime: end,
            reason: reason
        };

        blockings.push(newBlock);
        DB.saveBlockings(blockings);

        document.getElementById('block-start').value = '';
        document.getElementById('block-end').value = '';

        renderBlockings();
        updateCalendarAndSlots();
    }

    window.deleteManualBlock = (id) => {
        if (confirm('Deseja excluir este bloqueio da agenda?')) {
            const blockings = DB.getBlockings();
            const updated = blockings.filter(b => b.id !== id);
            DB.saveBlockings(updated);
            renderBlockings();
            updateCalendarAndSlots();
        }
    };


    // ==========================================
    // 9. ABA 5: CONFIGURAÇÕES E GERENCIADORES CMS
    // ==========================================
    const cmsServicesGrid = document.getElementById('cms-services-grid');
    const cmsGalleryGrid = document.getElementById('cms-gallery-grid');
    const galleryModal = document.getElementById('gallery-modal');
    const galleryForm = document.getElementById('gallery-form');
    
    function initConfigTab() {
        renderCMSServices();
        fillHoursRulesForm();
        fillCMSTextsForm();
        renderCMSGallery();
    }

    // SUB-ABA A: SERVIÇOS CMS
    function renderCMSServices() {
        const services = DB.getServices();
        cmsServicesGrid.innerHTML = '';

        services.forEach(srv => {
            const box = document.createElement('div');
            box.className = 'cms-service-item';
            box.innerHTML = `
                <div>
                    <h4 style="font-size: 1.15rem; font-family: var(--font-body); font-weight: 600; color: var(--color-black); margin-bottom: 0.3rem;">${srv.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--color-gold-dark); font-weight: 700; margin-bottom: 0.5rem;">
                        ⏱️ ${srv.duration} min | 💰 R$ ${srv.price.toFixed(2)}
                    </p>
                    <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 1rem;">
                        ${srv.description || 'Sem descrição.'}
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid rgba(197, 160, 89, 0.1); padding-top: 0.8rem;">
                    <button class="btn-slot-action btn-slot-msg" onclick="openEditServiceModal('${srv.id}')" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;">Editar</button>
                    <button class="btn-slot-action btn-slot-release" onclick="deleteService('${srv.id}')" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;">Excluir</button>
                </div>
            `;
            cmsServicesGrid.appendChild(box);
        });
    }

    document.getElementById('btn-open-new-service').addEventListener('click', () => {
        document.getElementById('service-id-field').value = '';
        document.getElementById('service-name-field').value = '';
        document.getElementById('service-duration-field').value = '';
        document.getElementById('service-price-field').value = '';
        document.getElementById('service-desc-field').value = '';
        document.getElementById('service-modal-title').innerText = 'Adicionar Serviço';
        serviceModal.classList.add('active');
    });

    document.getElementById('close-service-modal-btn').addEventListener('click', () => {
        serviceModal.classList.remove('active');
    });

    window.openEditServiceModal = (id) => {
        const services = DB.getServices();
        const srv = services.find(s => s.id === id);
        if (srv) {
            document.getElementById('service-id-field').value = srv.id;
            document.getElementById('service-name-field').value = srv.name;
            document.getElementById('service-duration-field').value = srv.duration;
            document.getElementById('service-price-field').value = srv.price;
            document.getElementById('service-desc-field').value = srv.description || '';
            document.getElementById('service-modal-title').innerText = 'Editar Serviço';
            serviceModal.classList.add('active');
        }
    };

    serviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('service-id-field').value;
        const name = document.getElementById('service-name-field').value.trim();
        const duration = Number(document.getElementById('service-duration-field').value);
        const price = Number(document.getElementById('service-price-field').value);
        const desc = document.getElementById('service-desc-field').value.trim();

        const services = DB.getServices();

        if (id) {
            const srv = services.find(s => s.id === id);
            if (srv) {
                srv.name = name;
                srv.duration = duration;
                srv.price = price;
                srv.description = desc;
            }
        } else {
            const newSrv = {
                id: SharedEngine.generateUUID(),
                name: name,
                duration: duration,
                price: price,
                description: desc,
                image: 'assets/images/servico-design.png'
            };
            services.push(newSrv);
        }

        DB.saveServices(services);
        populateServicesDropdowns();
        serviceModal.classList.remove('active');
        renderCMSServices();
    });

    window.deleteService = (id) => {
        if (confirm('Tem certeza que deseja excluir este serviço? Ele não aparecerá mais no site.')) {
            let services = DB.getServices();
            services = services.filter(s => s.id !== id);
            DB.saveServices(services);
            populateServicesDropdowns();
            renderCMSServices();
        }
    };

    // SUB-ABA B: REGRAS E HORAS
    function fillHoursRulesForm() {
        const settings = DB.getSettings();
        document.getElementById('cfg-start-time').value = settings.startTime;
        document.getElementById('cfg-last-start').value = settings.lastStartLimit;
        document.getElementById('cfg-close-time').value = settings.closingTime;
        document.getElementById('cfg-buffer').value = settings.bufferTime;
        
        document.querySelectorAll('input[name="cfg-workdays"]').forEach(box => {
            const val = Number(box.value);
            box.checked = settings.workDays.includes(val);
        });

        document.getElementById('cfg-lunch-blocks').value = settings.lunchBlocks.join(', ');
    }

    document.getElementById('settings-hours-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const start = document.getElementById('cfg-start-time').value;
        const last = document.getElementById('cfg-last-start').value;
        const close = document.getElementById('cfg-close-time').value;
        const buffer = Number(document.getElementById('cfg-buffer').value);

        if (start >= last || last >= close) {
            alert('Verifique a lógica dos horários! (Início < Último Início < Fechamento)');
            return;
        }

        const days = [];
        document.querySelectorAll('input[name="cfg-workdays"]:checked').forEach(box => {
            days.push(Number(box.value));
        });

        if (days.length === 0) {
            alert('Selecione pelo menos um dia de funcionamento!');
            return;
        }

        const lunchStr = document.getElementById('cfg-lunch-blocks').value;
        const lunchBlocks = lunchStr.split(',').map(s => s.trim()).filter(s => s !== '');

        const settings = DB.getSettings();
        settings.startTime = start;
        settings.lastStartLimit = last;
        settings.closingTime = close;
        settings.bufferTime = buffer;
        settings.workDays = days;
        settings.lunchBlocks = lunchBlocks;

        DB.saveSettings(settings);
        alert('Regras da agenda atualizadas com sucesso!');
        updateCalendarAndSlots();
    });

    // SUB-ABA C: CMS CONTEÚDOS
    function fillCMSTextsForm() {
        const siteContent = DB.getSiteContent();
        document.getElementById('cms-logo-text').value = siteContent.logoText || '';
        document.getElementById('cms-hero-title').value = siteContent.heroTitle || '';
        document.getElementById('cms-hero-desc').value = siteContent.heroDesc || '';
        document.getElementById('cms-tagline').value = siteContent.tagline || '';
        document.getElementById('cms-about-title').value = siteContent.aboutTitle || '';
        document.getElementById('cms-about-text1').value = siteContent.aboutText1 || '';
        document.getElementById('cms-about-text2').value = siteContent.aboutText2 || '';
        document.getElementById('cms-whatsapp').value = siteContent.whatsapp || '';
        document.getElementById('cms-instagram').value = siteContent.instagram || '';
        document.getElementById('cms-address').value = siteContent.address || '';
    }

    document.getElementById('settings-cms-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const siteContent = DB.getSiteContent();
        siteContent.logoText = document.getElementById('cms-logo-text').value.trim();
        siteContent.heroTitle = document.getElementById('cms-hero-title').value.trim();
        siteContent.heroDesc = document.getElementById('cms-hero-desc').value.trim();
        siteContent.tagline = document.getElementById('cms-tagline').value.trim();
        siteContent.aboutTitle = document.getElementById('cms-about-title').value.trim();
        siteContent.aboutText1 = document.getElementById('cms-about-text1').value.trim();
        siteContent.aboutText2 = document.getElementById('cms-about-text2').value.trim();
        siteContent.whatsapp = document.getElementById('cms-whatsapp').value.trim().replace(/\D/g, '');
        siteContent.instagram = document.getElementById('cms-instagram').value.trim();
        siteContent.address = document.getElementById('cms-address').value.trim();

        DB.saveSiteContent(siteContent);
        alert('Conteúdo do site publicado com sucesso!');
    });

    // SUB-ABA D: PORTFÓLIO GALERIA CMS
    function renderCMSGallery() {
        const gallery = DB.getGallery();
        cmsGalleryGrid.innerHTML = '';

        gallery.forEach(item => {
            const box = document.createElement('div');
            box.className = 'cms-service-item';
            box.innerHTML = `
                <div style="height: 140px; overflow: hidden; background-color: var(--color-nude-medium); margin-bottom: 0.8rem;">
                    <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div>
                    <h4 style="font-size: 1rem; font-weight: 600; color: var(--color-black); margin-bottom: 0.3rem;">${item.label}</h4>
                    <p style="font-size: 0.75rem; color: var(--color-text-muted); word-break: break-all;">${item.image}</p>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid rgba(197, 160, 89, 0.1); padding-top: 0.8rem;">
                    <button class="btn-slot-action btn-slot-release" onclick="deleteGalleryItem('${item.id}')" style="font-size: 0.7rem; padding: 0.4rem 0.8rem;">Excluir</button>
                </div>
            `;
            cmsGalleryGrid.appendChild(box);
        });
    }

    document.getElementById('btn-open-new-gallery').addEventListener('click', () => {
        document.getElementById('gallery-id-field').value = '';
        document.getElementById('gallery-image-field').value = '';
        document.getElementById('gallery-label-field').value = '';
        galleryModal.classList.add('active');
    });

    document.getElementById('close-gallery-modal-btn').addEventListener('click', () => {
        galleryModal.classList.remove('active');
    });

    galleryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const image = document.getElementById('gallery-image-field').value.trim();
        const label = document.getElementById('gallery-label-field').value.trim();

        const gallery = DB.getGallery();
        const newItem = {
            id: SharedEngine.generateUUID(),
            image: image,
            label: label
        };
        gallery.push(newItem);
        DB.saveGallery(gallery);

        galleryModal.classList.remove('active');
        renderCMSGallery();
    });

    window.deleteGalleryItem = (id) => {
        if (confirm('Tem certeza que deseja remover esta imagem da galeria?')) {
            let gallery = DB.getGallery();
            gallery = gallery.filter(g => g.id !== id);
            DB.saveGallery(gallery);
            renderCMSGallery();
        }
    };


    // ==========================================
    // 10. ABA 6: BACKUP & RESTAURAÇÃO
    // ==========================================
    const btnExport = document.getElementById('btn-export-backup');
    const fileInput = document.getElementById('backup-file-input');
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const dragBox = document.getElementById('backup-drag-box');

    btnExport.addEventListener('click', () => {
        const dataStr = DB.exportBackup();
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `bvirginia_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    btnTriggerUpload.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    dragBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragBox.style.borderColor = 'var(--color-black)';
        dragBox.style.backgroundColor = 'var(--color-nude-medium)';
    });

    dragBox.addEventListener('dragleave', () => {
        dragBox.style.borderColor = 'rgba(197, 160, 89, 0.4)';
        dragBox.style.backgroundColor = 'var(--color-white)';
    });

    dragBox.addEventListener('drop', (e) => {
        e.preventDefault();
        dragBox.style.borderColor = 'rgba(197, 160, 89, 0.4)';
        dragBox.style.backgroundColor = 'var(--color-white)';
        
        if (e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    }

    function processFile(file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const success = DB.importBackup(evt.target.result);
            if (success) {
                alert('Backup restaurado com sucesso! O painel será atualizado.');
                window.location.reload();
            } else {
                alert('Falha ao importar backup. Verifique se o arquivo JSON é válido.');
            }
        };
        reader.readAsText(file);
    }
});
