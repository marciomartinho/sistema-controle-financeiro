// ===== MÓDULO DE GERENCIAMENTO DO DASHBOARD =====

const DashboardManager = {
    
    // ===== ESTADO DA APLICAÇÃO =====
    state: {
        currentMonth: null,
        currentYear: null,
        isLoading: false,
        autoRefresh: false
    },

    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupModals();
        this.setupAnimations();
        this.setupAutoSubmit();
        this.setupSubcategoriaLoaders();
        this.setupTooltips();
        this.setupCounters();
        this.loadCurrentPeriod();
    },

    // ===== CONFIGURAÇÃO DOS MODAIS =====
    setupModals() {
        this.setupModalEditarUnico();
        this.setupModalExcluirUnico();
        this.setupModalEditarRecorrencia();
        this.setupModalExcluirRecorrencia();
    },

    // ===== MODAL EDITAR ÚNICO =====
    setupModalEditarUnico() {
        const modal = document.getElementById('modalEditarUnico');
        if (!modal) return;

        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            
            // Preencher campos
            this.setModalValue('edit_unico_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalValue('edit_unico_descricao', button.getAttribute('data-descricao'));
            this.setModalValue('edit_unico_valor', button.getAttribute('data-valor'));
            this.setModalValue('edit_unico_data', button.getAttribute('data-vencimento'));
            this.setModalValue('edit_unico_categoria', button.getAttribute('data-categoria-id'));
            
            // Verificar se é conta ou cartão
            const contaId = button.getAttribute('data-conta-id');
            const cartaoId = button.getAttribute('data-cartao-id');
            
            this.toggleContaCartaoFields('edit_unico', contaId, cartaoId);
            
            // Carregar subcategorias
            const categoriaId = button.getAttribute('data-categoria-id');
            const subcategoriaId = button.getAttribute('data-subcategoria-id');
            if (categoriaId) {
                this.carregarSubcategorias('edit_unico_categoria', 'edit_unico_subcategoria', subcategoriaId);
            }
        });
    },

    // ===== MODAL EXCLUIR ÚNICO =====
    setupModalExcluirUnico() {
        const modal = document.getElementById('modalExcluirUnico');
        if (!modal) return;

        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            
            this.setModalValue('del_unico_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalText('del_unico_descricao', button.getAttribute('data-descricao'));
        });
    },

    // ===== MODAL EDITAR RECORRÊNCIA =====
    setupModalEditarRecorrencia() {
        const modal = document.getElementById('modalEditarRecorrencia');
        if (!modal) return;

        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            
            // Preencher campos
            this.setModalValue('edit_rec_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalValue('edit_rec_recorrencia_id', button.getAttribute('data-recorrencia-id'));
            this.setModalValue('edit_rec_descricao', button.getAttribute('data-descricao'));
            this.setModalValue('edit_rec_valor', button.getAttribute('data-valor'));
            this.setModalValue('edit_rec_data', button.getAttribute('data-vencimento'));
            this.setModalValue('edit_rec_categoria', button.getAttribute('data-categoria-id'));
            
            // Verificar se é conta ou cartão
            const contaId = button.getAttribute('data-conta-id');
            const cartaoId = button.getAttribute('data-cartao-id');
            
            this.toggleContaCartaoFields('edit_rec', contaId, cartaoId);
            
            // Carregar subcategorias
            const categoriaId = button.getAttribute('data-categoria-id');
            const subcategoriaId = button.getAttribute('data-subcategoria-id');
            if (categoriaId) {
                this.carregarSubcategorias('edit_rec_categoria', 'edit_rec_subcategoria', subcategoriaId);
            }
        });
    },

    // ===== MODAL EXCLUIR RECORRÊNCIA =====
    setupModalExcluirRecorrencia() {
        const modal = document.getElementById('modalExcluirRecorrencia');
        if (!modal) return;

        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            
            this.setModalValue('del_rec_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalValue('del_rec_recorrencia_id', button.getAttribute('data-recorrencia-id'));
            this.setModalText('del_rec_descricao', button.getAttribute('data-descricao'));
            this.setModalText('del_rec_vencimento', button.getAttribute('data-vencimento'));
        });
    },

    // ===== TOGGLE ENTRE CONTA E CARTÃO =====
    toggleContaCartaoFields(prefix, contaId, cartaoId) {
        const contaField = document.getElementById(`${prefix}_conta_field`);
        const cartaoField = document.getElementById(`${prefix}_cartao_field`);
        const contaSelect = document.getElementById(`${prefix}_conta`);
        const cartaoSelect = document.getElementById(`${prefix}_cartao`);

        if (cartaoId && cartaoId !== '') {
            // É cartão
            if (contaField) contaField.style.display = 'none';
            if (cartaoField) cartaoField.style.display = 'block';
            if (cartaoSelect) cartaoSelect.value = cartaoId;
        } else {
            // É conta
            if (contaField) contaField.style.display = 'block';
            if (cartaoField) cartaoField.style.display = 'none';
            if (contaSelect) contaSelect.value = contaId;
        }
    },

    // ===== CARREGAMENTO DE SUBCATEGORIAS =====
    setupSubcategoriaLoaders() {
        // Event listeners para mudança de categoria
        const editUnicoCategoria = document.getElementById('edit_unico_categoria');
        const editRecCategoria = document.getElementById('edit_rec_categoria');

        if (editUnicoCategoria) {
            editUnicoCategoria.addEventListener('change', () => {
                this.carregarSubcategorias('edit_unico_categoria', 'edit_unico_subcategoria');
            });
        }

        if (editRecCategoria) {
            editRecCategoria.addEventListener('change', () => {
                this.carregarSubcategorias('edit_rec_categoria', 'edit_rec_subcategoria');
            });
        }
    },

    // ===== FUNÇÃO PARA CARREGAR SUBCATEGORIAS =====
    carregarSubcategorias(categoriaSelectId, subcategoriaSelectId, subcategoriaSelecionada = null) {
        const categoriaSelect = document.getElementById(categoriaSelectId);
        const subcategoriaSelect = document.getElementById(subcategoriaSelectId);
        
        if (!categoriaSelect || !subcategoriaSelect) return;
        
        const categoriaId = categoriaSelect.value;
        
        // Estado de loading
        subcategoriaSelect.innerHTML = '<option value="">Carregando...</option>';
        subcategoriaSelect.disabled = true;
        
        if (categoriaId) {
            fetch(`/api/subcategorias/${categoriaId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    subcategoriaSelect.innerHTML = '<option value="">Selecione...</option>';
                    
                    data.forEach(sub => {
                        const option = document.createElement('option');
                        option.value = sub.id;
                        option.textContent = sub.nome;
                        
                        if (subcategoriaSelecionada && sub.id == subcategoriaSelecionada) {
                            option.selected = true;
                        }
                        
                        subcategoriaSelect.appendChild(option);
                    });
                    
                    subcategoriaSelect.disabled = false;
                })
                .catch(error => {
                    console.error('Erro ao carregar subcategorias:', error);
                    subcategoriaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                    this.showNotification('Erro ao carregar subcategorias', 'error');
                });
        } else {
            subcategoriaSelect.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
            subcategoriaSelect.disabled = false;
        }
    },

    // ===== AUTO SUBMIT DOS FILTROS =====
    setupAutoSubmit() {
        const mesSelect = document.getElementById('mes');
        const anoSelect = document.getElementById('ano');

        if (mesSelect) {
            mesSelect.addEventListener('change', (e) => {
                this.state.currentMonth = e.target.value;
                this.submitFilters();
            });
        }

        if (anoSelect) {
            anoSelect.addEventListener('change', (e) => {
                this.state.currentYear = e.target.value;
                this.submitFilters();
            });
        }
    },

    submitFilters() {
        const form = document.querySelector('form[action*="dashboard"]');
        if (form) {
            this.showLoading();
            form.submit();
        }
    },

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animar cards de conta
        const contaCards = document.querySelectorAll('.conta-card');
        contaCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });

        // Animar tabelas
        const tabelas = document.querySelectorAll('.table-responsive');
        tabelas.forEach((tabela, index) => {
            tabela.style.animationDelay = `${(index * 0.2) + 0.5}s`;
            tabela.classList.add('slide-in-left');
        });

        // Animar resumo financeiro
        const resumo = document.querySelector('.resumo-financeiro');
        if (resumo) {
            resumo.style.animationDelay = '1s';
            resumo.classList.add('slide-in-right');
        }
    },

    // ===== TOOLTIPS =====
    setupTooltips() {
        // Inicializar tooltips do Bootstrap se disponível
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
    },

    // ===== CONTADORES ANIMADOS =====
    setupCounters() {
        const counters = document.querySelectorAll('.conta-card [data-saldo], h4, h5');
        
        counters.forEach(counter => {
            if (counter.textContent.includes('R$')) {
                this.animateCounter(counter);
            }
        });
    },

    animateCounter(element) {
        const text = element.textContent;
        const match = text.match(/R\$\s*([\d.,+-]+)/);
        
        if (!match) return;
        
        const value = parseFloat(match[1].replace(/[^\d,-]/g, '').replace(',', '.'));
        if (isNaN(value)) return;
        
        let current = 0;
        const increment = value / 30; // 30 frames de animação
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= value) || (increment < 0 && current <= value)) {
                current = value;
                clearInterval(timer);
            }
            
            const formattedValue = this.formatCurrency(current);
            element.textContent = text.replace(/R\$\s*[\d.,+-]+/, formattedValue);
        }, 50);
    },

    // ===== CARREGAMENTO DO PERÍODO ATUAL =====
    loadCurrentPeriod() {
        const mesSelect = document.getElementById('mes');
        const anoSelect = document.getElementById('ano');
        
        if (mesSelect) this.state.currentMonth = mesSelect.value;
        if (anoSelect) this.state.currentYear = anoSelect.value;
    },

    // ===== LOADING STATE =====
    showLoading() {
        this.state.isLoading = true;
        
        // Adicionar overlay de loading se não existir
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
            overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            overlay.style.zIndex = '9999';
            overlay.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 text-muted">Atualizando dashboard...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
    },

    hideLoading() {
        this.state.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    // ===== SISTEMA DE NOTIFICAÇÕES =====
    showNotification(message, type = 'info', duration = 5000) {
        // Criar container se não existir
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        const notificationId = 'notification-' + Date.now();
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show`;
        notification.setAttribute('role', 'alert');
        
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${this.getNotificationIcon(type)} me-2"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(notification);

        // Auto-remover
        setTimeout(() => {
            const element = document.getElementById(notificationId);
            if (element) {
                element.classList.remove('show');
                setTimeout(() => element.remove(), 300);
            }
        }, duration);
    },

    getBootstrapAlertClass(type) {
        const classes = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return classes[type] || 'info';
    },

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // ===== UTILITÁRIOS =====
    setModalValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value) {
            element.value = value;
        }
    },

    setModalText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element && text) {
            element.textContent = text;
        }
    },

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // ===== GETTERS E SETTERS DE ESTADO =====
    getState() {
        return { ...this.state };
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
    },

    // ===== REFRESH AUTOMÁTICO =====
    enableAutoRefresh(interval = 300000) { // 5 minutos
        if (this.state.autoRefresh) return;
        
        this.state.autoRefresh = setInterval(() => {
            if (!this.state.isLoading) {
                location.reload();
            }
        }, interval);
    },

    disableAutoRefresh() {
        if (this.state.autoRefresh) {
            clearInterval(this.state.autoRefresh);
            this.state.autoRefresh = false;
        }
    }
};

// ===== FUNÇÃO GLOBAL PARA CARREGAR SUBCATEGORIAS (compatibilidade) =====
window.carregarSubcategorias = function(categoriaSelectId, subcategoriaSelectId, subcategoriaSelecionada = null) {
    DashboardManager.carregarSubcategorias(categoriaSelectId, subcategoriaSelectId, subcategoriaSelecionada);
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    DashboardManager.init();
    
    // Ocultar loading quando a página estiver totalmente carregada
    window.addEventListener('load', function() {
        DashboardManager.hideLoading();
    });
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}