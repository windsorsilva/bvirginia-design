/**
 * B Virgínia Design - Data Provider Layer (db.js)
 * Abstração de banco de dados para facilitar futura migração para Supabase/Firebase.
 * Atualmente implementado sobre localStorage.
 */

const DB = {
    // Chaves do localStorage
    KEYS: {
        SERVICES: 'bvirginia_services',
        BOOKINGS: 'bvirginia_bookings',
        BLOCKINGS: 'bvirginia_blockings',
        SETTINGS: 'bvirginia_settings',
        SITE_CONTENT: 'bvirginia_site_content',
        CUSTOMERS: 'bvirginia_customers',
        GALLERY: 'bvirginia_gallery'
    },

    // ==========================================
    // INICIALIZAÇÃO DE DADOS PADRÃO (SE VAZIO)
    // ==========================================
    init() {
        // Correção de cache/migração: Forçar reset se os serviços antigos estiverem salvos
        const currentServices = localStorage.getItem(this.KEYS.SERVICES);
        if (currentServices) {
            try {
                const parsed = JSON.parse(currentServices);
                if (parsed.some(s => s.name === 'Design de sobrancelhas' || s.name === 'Extensão de cílios' || s.id === 's1')) {
                    console.log('[Database] Resetando serviços antigos cacheáveis detectados...');
                    localStorage.removeItem(this.KEYS.SERVICES);
                }
            } catch (e) {
                localStorage.removeItem(this.KEYS.SERVICES);
            }
        }

        // Se detectada configuração antiga (que misturava CMS e regras), forçar reset para aplicar o novo padrão
        const currentSettings = localStorage.getItem(this.KEYS.SETTINGS);
        if (currentSettings) {
            try {
                const parsed = JSON.parse(currentSettings);
                if (parsed.logoText || parsed.whatsapp || parsed.address) {
                    console.log('[Database] Resetando configuração antiga misturada com CMS...');
                    localStorage.removeItem(this.KEYS.SETTINGS);
                    localStorage.removeItem(this.KEYS.SITE_CONTENT);
                }
            } catch (e) {
                localStorage.removeItem(this.KEYS.SETTINGS);
            }
        }

        // 1. Serviços Padrão com Duração, Preço e IDs UUID Robustos
        if (!localStorage.getItem(this.KEYS.SERVICES)) {
            const defaultServices = [
                { id: 'a7d6a59b-13cd-41fb-a14a-10f85ee91931', name: 'Design simples', duration: 25, price: 30, image: 'assets/images/servico-design.png', description: 'Alinhamento rápido e limpeza dos fios sobressalentes da sobrancelha.' },
                { id: 'b8e7b60c-24de-52fc-b25b-21f96ff02042', name: 'Design com henna', duration: 40, price: 50, image: 'assets/images/servico-design.png', description: 'Design personalizado com aplicação de henna para preenchimento de falhas.' },
                { id: 'c9f8c71d-35ef-63fd-c36c-32fa70a13153', name: 'Fox Eyes', duration: 180, price: 180, image: 'assets/images/servico-fox-eyes.png', description: 'Extensão de cílios projetada para criar um olhar alongado e marcante.' },
                { id: 'd0a9d82e-46f0-74fe-d47d-43fb81b24264', name: 'Sirena', duration: 60, price: 90, image: 'assets/images/servico-sirena.png', description: 'Efeito sereia que alonga os cantos de forma elegante e sutil.' },
                { id: 'e1b0e93f-57f1-85ff-e58e-54fc92c35375', name: 'Volume Brasileiro', duration: 120, price: 120, image: 'assets/images/servico-brasileiro.png', description: 'Aplicação clássica com fios em formato Y, oferecendo volume e leveza.' },
                { id: 'f2c1fa4a-68f2-9600-f69f-65fd03d46486', name: 'Volume 5D', duration: 120, price: 140, image: 'assets/images/servico-volume-5d.png', description: 'Cílios com leques de 5 fios para um olhar preenchido e sofisticado.' },
                { id: '03d2fb5b-79f3-a711-07a0-76fe14e57597', name: 'Volume 6D', duration: 120, price: 160, image: 'assets/images/servico-volume-5d.png', description: 'Leques de 6 fios para um volume extra e olhar profundo.' },
                { id: '14e3fc6c-8af4-b822-18b1-87ff25f686a8', name: 'Volume 4D Luxo', duration: 120, price: 130, image: 'assets/images/servico-volume-5d.png', description: 'Volume elegante e intermediário para cílios curvados e macios.' }
            ];
            this.saveServices(defaultServices);
        }

        // 2. Configurações Operacionais Padrão (Regras do Sistema)
        if (!localStorage.getItem(this.KEYS.SETTINGS)) {
            const defaultSettings = {
                workDays: [2, 3, 4, 5, 6], // Terça (2) a Sábado (6)
                startTime: '10:00',
                lastStartLimit: '19:00',
                closingTime: '21:00',
                bufferTime: 10, // 10 minutos de intervalo/limpeza
                lunchBlocks: ['12:00', '12:30', '13:00', '13:30'] // Horário de almoço
            };
            this.saveSettings(defaultSettings);
        }

        // 3. Textos do Site (CMS e Contatos de Mídias Sociais)
        if (!localStorage.getItem(this.KEYS.SITE_CONTENT)) {
            const defaultSiteContent = {
                logoText: 'B Virgínia Design',
                heroTitle: 'Beleza através do olhar ✨',
                heroDesc: 'Realce sua beleza com sobrancelhas e cílios feitos para valorizar a sua essência.',
                aboutTitle: 'Seu olhar merece cuidado',
                aboutText1: 'Na B Virgínia Design, cada atendimento é pensado para realçar sua beleza de forma única, delicada e sofisticada. Trabalhamos com técnicas personalizadas para valorizar seu olhar e elevar sua autoestima.',
                aboutText2: 'Localizado no coração de Bela Vista, Cabo de Santo Agostinho – PE, o espaço foi planejado para oferecer conforto, segurança e uma experiência de bem-estar inesquecível. Aqui, a sua beleza natural é a nossa maior inspiração.',
                whatsapp: '5581989002496',
                instagram: 'bvirginiadesign',
                address: 'Bela Vista, Cabo de Santo Agostinho - PE',
                tagline: '“Realçando sua beleza através do olhar.”'
            };
            this.saveSiteContent(defaultSiteContent);
        }

        // 4. Clientes Padrão (CRM) com IDs UUID Robustos
        if (!localStorage.getItem(this.KEYS.CUSTOMERS)) {
            const defaultCustomers = [
                { id: '25f4fd7d-9bf5-c933-29c2-98aa36a797b9', name: 'Amanda Silva', phone: '(81) 98765-4321', history: [] },
                { id: '36a5fe8e-0cf6-da44-3ad3-a9bb47b8a8ca', name: 'Beatriz Costa', phone: '(81) 98888-2222', history: [] },
                { id: '47b6ff9f-1df7-eb55-4be4-bacc58c9b9db', name: 'Caroline Ramos', phone: '(81) 99999-4444', history: [] }
            ];
            this.saveCustomers(defaultCustomers);
        }

        // 5. Bloqueios Manuais Padrão (Vazio inicialmente)
        if (!localStorage.getItem(this.KEYS.BLOCKINGS)) {
            this.saveBlockings([]);
        }

        // 6. Galeria de Fotos Padrão (CMS Dinâmico) com IDs UUID Robustos
        if (!localStorage.getItem(this.KEYS.GALLERY)) {
            const defaultGallery = [
                { id: '7ae902cc-40ba-1e88-7ef7-edff8bf22cf0', image: 'assets/images/galeria-1.png', label: 'Design Perfeito' },
                { id: '8bf003dd-51cb-2f99-8ff8-fe009c033df1', image: 'assets/images/galeria-2.png', label: 'Volume Clássico' },
                { id: '9c0104ee-62dc-3faa-9ff9-ff11ad144ef2', image: 'assets/images/galeria-3.png', label: 'Efeito Fox Eyes' },
                { id: 'ad1205ff-73ed-4fbb-aff0-0022be255f03', image: 'assets/images/galeria-4.png', label: 'Efeito Sirena' },
                { id: 'be230600-84fe-5fcc-bff1-1133cf366f14', image: 'assets/images/galeria-5.png', label: 'Volume Brasileiro' },
                { id: 'cf340711-95ff-6fdd-cff2-2244df477f25', image: 'assets/images/galeria-6.png', label: 'Sobrancelhas e Henna' }
            ];
            this.saveGallery(defaultGallery);
        }

        // 7. Agendamentos Iniciais Padrão (Para hoje) com IDs UUID Robustos
        if (!localStorage.getItem(this.KEYS.BOOKINGS)) {
            const todayStr = new Date().toISOString().split('T')[0];
            const defaultBookings = [
                {
                    id: '58c700aa-2ef8-fc66-5cf5-cbdd69da0ade',
                    date: todayStr,
                    time: '10:00',
                    clientName: 'Amanda Silva',
                    clientPhone: '(81) 98765-4321',
                    service: 'Design simples',
                    price: 30,
                    duration: 25,
                    paymentStatus: 'Pago',
                    paymentMethod: 'PIX',
                    status: 'Confirmado',
                    origin: 'Admin',
                    createdAt: Date.now()
                },
                {
                    id: '69d801bb-3fa9-0d77-6df6-dcee7ae11bef',
                    date: todayStr,
                    time: '14:00',
                    clientName: 'Beatriz Costa',
                    clientPhone: '(81) 98888-2222',
                    service: 'Sirena',
                    price: 90,
                    duration: 60,
                    paymentStatus: 'Pendente',
                    paymentMethod: 'Dinheiro',
                    status: 'Confirmado',
                    origin: 'Site',
                    createdAt: Date.now()
                }
            ];
            this.saveBookings(defaultBookings);
            
            // Vincular histórico inicial
            const customers = this.getCustomers();
            customers[0].history.push('58c700aa-2ef8-fc66-5cf5-cbdd69da0ade');
            customers[1].history.push('69d801bb-3fa9-0d77-6df6-dcee7ae11bef');
            this.saveCustomers(customers);
        }
    },

    // ==========================================
    // CAMADA DE ACESSO (DATA PROVIDER METHODS)
    // ==========================================

    // Serviços
    getServices() {
        return JSON.parse(localStorage.getItem(this.KEYS.SERVICES)) || [];
    },
    saveServices(services) {
        localStorage.setItem(this.KEYS.SERVICES, JSON.stringify(services));
    },

    // Agendamentos
    getBookings() {
        return JSON.parse(localStorage.getItem(this.KEYS.BOOKINGS)) || [];
    },
    saveBookings(bookings) {
        localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(bookings));
    },

    // Bloqueios Manuais
    getBlockings() {
        return JSON.parse(localStorage.getItem(this.KEYS.BLOCKINGS)) || [];
    },
    saveBlockings(blockings) {
        localStorage.setItem(this.KEYS.BLOCKINGS, JSON.stringify(blockings));
    },

    // Clientes (CRM)
    getCustomers() {
        return JSON.parse(localStorage.getItem(this.KEYS.CUSTOMERS)) || [];
    },
    saveCustomers(customers) {
        localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(customers));
    },

    // Galeria (CMS)
    getGallery() {
        return JSON.parse(localStorage.getItem(this.KEYS.GALLERY)) || [];
    },
    saveGallery(gallery) {
        localStorage.setItem(this.KEYS.GALLERY, JSON.stringify(gallery));
    },

    // Configurações e Regras de Negócio
    getSettings() {
        return JSON.parse(localStorage.getItem(this.KEYS.SETTINGS)) || {};
    },
    saveSettings(settings) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
    },

    // Conteúdo do site (CMS)
    getSiteContent() {
        return JSON.parse(localStorage.getItem(this.KEYS.SITE_CONTENT)) || {};
    },
    saveSiteContent(content) {
        localStorage.setItem(this.KEYS.SITE_CONTENT, JSON.stringify(content));
    },

    // ==========================================
    // SISTEMA DE BACKUP (IMPORTAR/EXPORTAR JSON)
    // ==========================================
    exportBackup() {
        const data = {
            services: this.getServices(),
            bookings: this.getBookings(),
            blockings: this.getBlockings(),
            settings: this.getSettings(),
            siteContent: this.getSiteContent(),
            customers: this.getCustomers(),
            gallery: this.getGallery(),
            exportedAt: new Date().toISOString(),
            version: '1.2'
        };
        return JSON.stringify(data, null, 2);
    },

    importBackup(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.services || (!data.settings && !data.siteContent)) {
                throw new Error('Arquivo de backup inválido.');
            }
            
            if (data.services) this.saveServices(data.services);
            if (data.bookings) this.saveBookings(data.bookings);
            if (data.blockings) this.saveBlockings(data.blockings);
            if (data.settings) this.saveSettings(data.settings);
            if (data.siteContent) this.saveSiteContent(data.siteContent);
            
            // Fallback para backups mais antigos em que as configurações e os textos do CMS eram unificados
            if (data.settings && !data.siteContent) {
                const oldSettings = data.settings;
                const extractedContent = {
                    logoText: oldSettings.logoText || 'B Virgínia Design',
                    heroTitle: oldSettings.heroTitle || 'Beleza através do olhar ✨',
                    heroDesc: oldSettings.heroDesc || '',
                    aboutTitle: oldSettings.aboutTitle || 'Seu olhar merece cuidado',
                    aboutText1: oldSettings.aboutText1 || '',
                    aboutText2: oldSettings.aboutText2 || '',
                    whatsapp: oldSettings.whatsapp || '5581989002496',
                    instagram: oldSettings.instagram || 'bvirginiadesign',
                    address: oldSettings.address || 'Bela Vista, Cabo de Santo Agostinho - PE',
                    tagline: oldSettings.tagline || ''
                };
                this.saveSiteContent(extractedContent);

                const cleanedSettings = {
                    workDays: oldSettings.workDays || [2, 3, 4, 5, 6],
                    startTime: oldSettings.startTime || '10:00',
                    lastStartLimit: oldSettings.lastStartLimit || '19:00',
                    closingTime: oldSettings.closingTime || '21:00',
                    bufferTime: oldSettings.bufferTime || 10,
                    lunchBlocks: oldSettings.lunchBlocks || ['12:00', '12:30', '13:00', '13:30']
                };
                this.saveSettings(cleanedSettings);
            }
            
            if (data.customers) this.saveCustomers(data.customers);
            if (data.gallery) this.saveGallery(data.gallery);
            
            return true;
        } catch (e) {
            console.error('Erro na importação do backup:', e);
            return false;
        }
    }
};

// Auto-inicializar ao carregar o arquivo
DB.init();
