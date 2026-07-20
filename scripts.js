/**
 * B Virgínia Design - Public UI Engine (scripts.js)
 * Renderização dinâmica (CMS) e agendamento em grade (estilo Best Barber).
 * Requer db.js e shared.js importados previamente.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. Limpar reservas temporárias expiradas ao carregar a página
    SharedEngine.cleanupExpiredBookings();

    // ==========================================
    // 1. CARREGAMENTO DINÂMICO DE CONTEÚDO (CMS)
    // ==========================================
    const settings = DB.getSettings();
    const siteContent = DB.getSiteContent();
    const services = DB.getServices();

    // Textos do Cabeçalho e Rodapé
    document.getElementById('header-logo-cms').innerText = siteContent.logoText || 'B Virgínia Design';
    document.getElementById('footer-logo-cms').innerText = siteContent.logoText || 'B Virgínia Design';
    document.getElementById('footer-tagline-cms').innerText = siteContent.tagline || '';
    
    // Contato e Endereço
    const displayAddress = `📍 ${siteContent.address || 'Bela Vista, Cabo de Santo Agostinho - PE'}`;
    const displayPhone = `💬 WhatsApp: +55 ${formatPhoneDisplay(siteContent.whatsapp)}`;
    
    document.getElementById('footer-address-cms').innerText = displayAddress;
    document.getElementById('footer-phone-cms').innerText = displayPhone;
    document.getElementById('booking-address-cms').innerText = siteContent.address || 'Bela Vista, Cabo de Santo Agostinho - PE';
    document.getElementById('booking-phone-cms').innerText = `+55 ${formatPhoneDisplay(siteContent.whatsapp)}`;
    document.getElementById('booking-hours-cms').innerText = getOperatingHoursText(settings.workDays);

    // Links de Redes Sociais
    const instagramUrl = `https://www.instagram.com/${siteContent.instagram || 'bvirginiadesign'}/`;
    const whatsappBaseUrl = `https://wa.me/${siteContent.whatsapp || '5581989002496'}`;

    document.getElementById('header-instagram-link').href = instagramUrl;
    document.getElementById('footer-instagram-link').href = instagramUrl;
    document.getElementById('footer-contact-instagram-link').href = instagramUrl;
    document.getElementById('footer-contact-instagram-link').innerText = `@${siteContent.instagram || 'bvirginiadesign'}`;

    // WhatsApp Direct Links (Capa, Rodapé e Flutuante)
    const generalWaMessage = `Olá, B Virgínia Design! Gostaria de tirar algumas dúvidas.`;
    const generalWaUrl = `${whatsappBaseUrl}?text=${encodeURIComponent(generalWaMessage)}`;

    document.getElementById('hero-whatsapp-btn').href = whatsappBaseUrl + `?text=${encodeURIComponent('Olá, B Virgínia Design! Gostaria de solicitar um agendamento.')}`;
    document.getElementById('footer-whatsapp-link').href = generalWaUrl;
    document.getElementById('floating-whatsapp-btn').href = generalWaUrl;

    // Hero Textos
    document.getElementById('hero-subtitle-cms').innerText = siteContent.logoText || 'B Virgínia Design';
    document.getElementById('hero-title-cms').innerText = siteContent.heroTitle || 'Beleza através do olhar ✨';
    document.getElementById('hero-desc-cms').innerText = siteContent.heroDesc || '';

    // Sobre Textos e Imagem
    document.getElementById('about-title-cms').innerText = siteContent.aboutTitle || 'Seu olhar merece cuidado';
    document.getElementById('about-text1-cms').innerText = siteContent.aboutText1 || '';
    document.getElementById('about-text2-cms').innerText = siteContent.aboutText2 || '';
    
    // Tratamento de fotos dinâmico
    const aboutImg = document.getElementById('about-img-cms');
    if (aboutImg) {
        aboutImg.src = 'assets/images/hero-bg.png';
    }

    // Renderização dinâmica da galeria (CMS)
    const gallery = DB.getGallery();
    const galleryGrid = document.getElementById('dynamic-gallery');
    if (galleryGrid) {
        galleryGrid.innerHTML = '';
        gallery.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `
                <img src="${item.image}" alt="Resultado de ${item.label}" class="gallery-img" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-text">${item.label}</span>
                </div>
            `;
            galleryGrid.appendChild(div);
        });
    }

    // ==========================================
    // 2. RENDERIZAÇÃO DA GRADE DE SERVIÇOS
    // ==========================================
    const servicesGrid = document.getElementById('dynamic-services');
    const serviceDropdown = document.getElementById('form-service');

    if (servicesGrid) {
        servicesGrid.innerHTML = '';
        services.forEach(srv => {
            // Gerar o ID do Supabase com base no nome do serviço (slug)
            const supabaseIdMap = {
                'Design simples':    'foto-design-simples',
                'Design com henna':  'foto-design-henna',
                'Fox Eyes':          'foto-fox-eyes'
            };
            const supabaseId = supabaseIdMap[srv.name] || '';
            const supabaseAttr = supabaseId ? ` data-supabase-id="${supabaseId}"` : '';

            // Adicionar card na grade pública
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-img-wrapper">
                    <img src="${srv.image || 'assets/images/servico-design.png'}" alt="Procedimento ${srv.name}" class="service-img" loading="lazy"${supabaseAttr}>
                </div>
                <div class="service-info">
                    <h3 class="service-name">
                        <span>${srv.name}</span>
                        <span class="service-price">R$ ${srv.price.toFixed(2)}</span>
                    </h3>
                    <span class="service-meta">⏱️ Duração: ${srv.duration} min</span>
                    <p class="service-desc">${srv.description || 'Técnica personalizada de realce e harmonização estética.'}</p>
                    <button class="btn btn-card-booking btn-select-service" data-service-name="${srv.name}">Agendar</button>
                </div>
            `;
            servicesGrid.appendChild(card);
            
            // Adicionar opção no formulário de agendamento
            const option = document.createElement('option');
            option.value = srv.name;
            option.innerText = `${srv.name} — R$ ${srv.price.toFixed(2)} (${srv.duration} min)`;
            serviceDropdown.appendChild(option);
        });

        // Evento dos botões "Agendar" dos cards: seleciona no form e desce a página
        document.querySelectorAll('.btn-select-service').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const srvName = e.target.getAttribute('data-service-name');
                if (serviceDropdown) {
                    serviceDropdown.value = srvName;
                    // Limpar horário selecionado anteriormente
                    const timeInput = document.getElementById('form-time');
                    if (timeInput) timeInput.value = '';
                    
                    // Rolar suavemente para a seção de agendamento
                    document.querySelector('#agendamento').scrollIntoView({ behavior: 'smooth' });
                    
                    // Forçar atualização da grade de horários
                    updateBookingSlots();
                }
            });
        });
    }

    // ==========================================
    // 3. GRADE DE HORÁRIOS DINÂMICA (CLIENTE)
    // ==========================================
    const dateInput = document.getElementById('form-date');
    const timeInput = document.getElementById('form-time');
    const slotsSection = document.getElementById('slots-section');
    const slotsContainer = document.getElementById('slots-container');
    const slotsLoadingMsg = document.getElementById('slots-loading-msg');

    function updateBookingSlots() {
        const service = serviceDropdown.value;
        const date = dateInput.value;

        if (!service || !date) {
            slotsSection.style.display = 'none';
            return;
        }

        // Buscar horários calculados pela lógica compartilhada
        const result = SharedEngine.getAvailableSlots(date, service);

        slotsSection.style.display = 'block';
        slotsContainer.innerHTML = '';
        slotsLoadingMsg.style.display = 'none';

        if (result.closed) {
            slotsContainer.innerHTML = `<span style="font-size: 0.85rem; color: #b91c1c; font-weight: 500;">${result.message}</span>`;
            timeInput.value = '';
            return;
        }

        let availableCount = 0;

        result.slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'slot-btn';
            btn.innerHTML = `
                <span>${slot.time}</span>
                <span class="slot-status-label" style="color: ${slot.available ? '#15803d' : '#b91c1c'}">${slot.label}</span>
            `;

            if (!slot.available) {
                btn.classList.add('disabled');
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    timeInput.value = slot.time;
                });
                availableCount++;
            }

            slotsContainer.appendChild(btn);
        });

        if (availableCount === 0) {
            slotsContainer.innerHTML = '<span style="font-size: 0.85rem; color: #b91c1c; font-weight: 500;">Não há tempo disponível suficiente para este serviço na data selecionada.</span>';
        }
    }

    if (serviceDropdown && dateInput) {
        serviceDropdown.addEventListener('change', () => {
            timeInput.value = '';
            updateBookingSlots();
        });
        dateInput.addEventListener('change', () => {
            timeInput.value = '';
            updateBookingSlots();
        });
    }

    // ==========================================
    // 4. ENVIO DE AGENDAMENTO (RESERVA TEMPORÁRIA)
    // ==========================================
    const bookingForm = document.getElementById('booking-form');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');

    let currentTempBookingId = '';

    if (bookingForm && confirmationModal) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('form-name').value.trim();
            const phone = document.getElementById('form-phone').value.trim();
            const service = serviceDropdown.value;
            const date = dateInput.value;
            const time = timeInput.value;
            const notes = document.getElementById('form-notes').value.trim() || 'Nenhuma';

            if (!time) {
                alert('Por favor, selecione um horário disponível na grade.');
                return;
            }

            const selectedSrv = services.find(s => s.name === service);
            const price = selectedSrv ? selectedSrv.price : 0;
            const duration = selectedSrv ? selectedSrv.duration : 30;

            // Criar a reserva temporária (bloqueia o horário por 10 minutos)
            const bookings = DB.getBookings();
            currentTempBookingId = SharedEngine.generateUUID();

            const tempBooking = {
                id: currentTempBookingId,
                date: date,
                time: time,
                clientName: name,
                clientPhone: phone,
                service: service,
                price: price,
                duration: duration,
                paymentStatus: 'Pendente',
                paymentMethod: 'Pendente',
                status: 'Temporario', // Status de reserva fantasma expirável
                origin: 'Site', // Origem do agendamento (Site público)
                createdAt: Date.now(),
                notes: notes
            };

            bookings.push(tempBooking);
            DB.saveBookings(bookings);

            // Preparar a mensagem para envio do WhatsApp posterior
            const dateParts = date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const messageText = `Olá, B Virgínia Design! Gostaria de solicitar um agendamento.
Nome: ${name}
Serviço: ${service}
Data: ${formattedDate}
Horário: ${time}
Observações: ${notes}`;

            generatedWhatsAppUrl = `${whatsappBaseUrl}?text=${encodeURIComponent(messageText)}`;

            // Exibir modal de confirmação interna
            confirmationModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Atualizar os horários exibidos (bloqueia o slot imediatamente no navegador do cliente)
            updateBookingSlots();
        });

        // Clique em Cancelar/Editar no Modal (Libera a reserva temporária na hora)
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', () => {
                if (currentTempBookingId) {
                    let bookings = DB.getBookings();
                    bookings = bookings.filter(b => b.id !== currentTempBookingId);
                    DB.saveBookings(bookings);
                    currentTempBookingId = '';
                }
                confirmationModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                updateBookingSlots();
            });
        }

        // Clique em Prosseguir no Modal (Confirma a reserva e envia WhatsApp)
        if (modalConfirmBtn) {
            modalConfirmBtn.addEventListener('click', () => {
                if (currentTempBookingId) {
                    const bookings = DB.getBookings();
                    const bookingObj = bookings.find(b => b.id === currentTempBookingId);
                    
                    if (bookingObj) {
                        // Confirmar reserva como Pendente na Agenda
                        bookingObj.status = 'Pendente';
                        bookingObj.createdAt = Date.now(); // atualiza o timestamp
                        
                        // Atualizar ou criar cadastro da cliente no CRM
                        updateOrCreateCustomer(bookingObj.clientName, bookingObj.clientPhone, bookingObj.id);
                    }
                    DB.saveBookings(bookings);
                }

                // Abrir o WhatsApp do celular/navegador
                window.open(generatedWhatsAppUrl, '_blank', 'noopener,noreferrer');

                // Fechar modal e resetar formulário
                confirmationModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                bookingForm.reset();
                timeInput.value = '';
                slotsSection.style.display = 'none';
                currentTempBookingId = '';
            });
        }
    }

    // ==========================================
    // 5. FUNÇÕES AUXILIARES
    // ==========================================
    function formatPhoneDisplay(phoneStr) {
        if (!phoneStr) return '';
        // Remove 55 do início para exibição amigável
        let clean = phoneStr.replace(/\D/g, '');
        if (clean.startsWith('55')) {
            clean = clean.substring(2);
        }
        if (clean.length === 11) {
            return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
        }
        return clean;
    }

    function getOperatingHoursText(workDays) {
        // Converte array de dias da semana em texto
        if (workDays.includes(2) && workDays.includes(6) && workDays.length === 5) {
            return 'Terça a Sábado, com hora marcada';
        }
        return 'Com hora marcada';
    }

    function updateOrCreateCustomer(name, phone, bookingId) {
        const customers = DB.getCustomers();
        // Limpar telefone para busca exata no CRM
        const cleanPhone = phone.replace(/\D/g, '');
        
        let customer = customers.find(c => c.phone.replace(/\D/g, '') === cleanPhone);

        if (!customer) {
            // Novo cadastro
            customer = {
                id: 'c_' + Date.now(),
                name: name,
                phone: phone,
                history: [bookingId]
            };
            customers.push(customer);
        } else {
            // Cliente existente, adiciona ao histórico
            if (!customer.history.includes(bookingId)) {
                customer.history.push(bookingId);
            }
        }
        DB.saveCustomers(customers);
    }

    // ==========================================
    // 6. EFEITO DE SCROLL E MENU HAMBÚRGUER
    // ==========================================
    const header = document.querySelector('.header');
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const menuToggle = document.getElementById('menu-toggle-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : 'auto';
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // ==========================================
    // 7. ANIMAÇÕES AO ROLAR (INTERSECTION OBSERVER)
    // ==========================================
    const animElements = document.querySelectorAll('.scroll-reveal, .fade-in-up');
    if ('IntersectionObserver' in window) {
        const animObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        animElements.forEach(el => animObserver.observe(el));
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.classList.add('active');
    } else {
        animElements.forEach(el => el.classList.add('active'));
    }

    // ==========================================
    // 8. DATA MÍNIMA DO INPUT (HOJE)
    // ==========================================
    if (dateInput) {
        const todayStr = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', todayStr);
    }

    // Máscara WhatsApp
    const phoneInput = document.getElementById('form-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });
    }
});
