// ===== MÓDULO DE GERENCIAMENTO DE CATEGORIAS =====

const CategoriasManager = {
    
    // ===== ESTADO DA APLICAÇÃO =====
    state: {
        currentView: 'grid',
        selectedIcon: 'bi-tag-fill',
        previewColor: '#667eea',
        isSearching: false
    },

    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupColorPreview();
        this.setupIconPreview();
        this.setupViewToggle();
        this.setupIconModal();
        this.setupConfirmationModal();
        this.setupAnimations();
        this.setupToastSystem();
        this.initializePreviews();
    },

    // ===== PREVIEW DE COR ===== 
    setupColorPreview() {
        const corInput = document.getElementById('cor');
        const colorPreview = document.getElementById('colorPreview');
        const iconPreview = document.getElementById('iconPreview');
        
        if (!corInput || !colorPreview || !iconPreview) return;

        const updateColorPreview = () => {
            const cor = corInput.value;
            this.state.previewColor = cor;
            colorPreview.style.backgroundColor = cor;
            iconPreview.style.color = cor;
        };

        corInput.addEventListener('input', updateColorPreview);
        corInput.addEventListener('change', updateColorPreview);
        
        // Inicializar
        updateColorPreview();
    },

    // ===== PREVIEW DE ÍCONE =====
    setupIconPreview() {
        const iconeInput = document.getElementById('icone');
        const iconPreview = document.getElementById('iconPreview');
        
        if (!iconeInput || !iconPreview) return;

        const updateIconPreview = () => {
            const icone = iconeInput.value || 'bi-tag-fill';
            this.state.selectedIcon = icone;
            iconPreview.className = `bi ${icone} fs-3`;
        };

        iconeInput.addEventListener('input', updateIconPreview);
        iconeInput.addEventListener('change', updateIconPreview);
        
        // Inicializar
        updateIconPreview();
    },

    // ===== TOGGLE ENTRE VIEWS =====
    setupViewToggle() {
        const gridView = document.getElementById('gridView');
        const listView = document.getElementById('listView');
        const gridContent = document.getElementById('gridViewContent');
        const listContent = document.getElementById('listViewContent');

        if (!gridView || !listView || !gridContent || !listContent) return;

        gridView.addEventListener('change', () => {
            if (gridView.checked) {
                this.state.currentView = 'grid';
                gridContent.style.display = 'block';
                listContent.style.display = 'none';
                this.animateViewTransition('grid');
            }
        });
        
        listView.addEventListener('change', () => {
            if (listView.checked) {
                this.state.currentView = 'list';
                gridContent.style.display = 'none';
                listContent.style.display = 'block';
                this.animateViewTransition('list');
            }
        });
    },

    // ===== MODAL DE ÍCONES =====
    setupIconModal() {
        this.setupIconSelection();
        this.setupIconSearch();
        this.loadPopularIcons();
    },

    // ===== SELEÇÃO DE ÍCONES =====
    setupIconSelection() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.icon-option')) {
                const iconOption = e.target.closest('.icon-option');
                const iconClass = iconOption.getAttribute('data-icon');
                
                if (iconClass) {
                    this.selectIcon(iconClass);
                    this.closeIconModal();
                }
            }
        });
    },

    // ===== PESQUISA DE ÍCONES =====
    setupIconSearch() {
        const searchInput = document.getElementById('searchIcon');
        if (!searchInput) return;

        searchInput.addEventListener('input', this.debounce((e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterIcons(searchTerm);
        }, 300));
    },

    // ===== FILTRAR ÍCONES =====
    filterIcons(searchTerm) {
        const iconOptions = document.querySelectorAll('.icon-option');
        let visibleCount = 0;

        iconOptions.forEach(option => {
            const title = option.getAttribute('title')?.toLowerCase() || '';
            const text = option.querySelector('small')?.textContent.toLowerCase() || '';
            const iconClass = option.getAttribute('data-icon')?.toLowerCase() || '';
            
            const matches = title.includes(searchTerm) || 
                           text.includes(searchTerm) || 
                           iconClass.includes(searchTerm);
            
            if (matches || searchTerm === '') {
                option.style.display = 'flex';
                option.style.animationDelay = `${visibleCount * 0.05}s`;
                option.classList.add('fade-in-up');
                visibleCount++;
            } else {
                option.style.display = 'none';
                option.classList.remove('fade-in-up');
            }
        });

        // Mostrar mensagem se não encontrar nenhum ícone
        this.toggleNoResultsMessage(visibleCount === 0 && searchTerm !== '');
    },

    // ===== MENSAGEM DE "NENHUM RESULTADO" =====
    toggleNoResultsMessage(show) {
        let noResultsDiv = document.getElementById('noIconResults');
        
        if (show && !noResultsDiv) {
            noResultsDiv = document.createElement('div');
            noResultsDiv.id = 'noIconResults';
            noResultsDiv.className = 'text-center py-4 text-muted';
            noResultsDiv.innerHTML = `
                <i class="bi bi-search fs-1 mb-2 d-block"></i>
                <p class="mb-0">Nenhum ícone encontrado</p>
                <small>Tente termos como "casa", "dinheiro", "comida"...</small>
            `;
            document.getElementById('iconsGrid').appendChild(noResultsDiv);
        } else if (!show && noResultsDiv) {
            noResultsDiv.remove();
        }
    },

    // ===== CARREGAR ÍCONES POPULARES =====
    loadPopularIcons() {
        const iconsGrid = document.getElementById('iconsGrid');
        if (!iconsGrid) return;

        // Lista de ícones populares para categorias financeiras
        const popularIcons = [
            { icon: 'bi-house-door-fill', title: 'Casa/Moradia', text: 'Casa' },
            { icon: 'bi-car-front-fill', title: 'Transporte', text: 'Transporte' },
            { icon: 'bi-basket-fill', title: 'Alimentação', text: 'Alimentação' },
            { icon: 'bi-heart-pulse-fill', title: 'Saúde', text: 'Saúde' },
            { icon: 'bi-book-fill', title: 'Educação', text: 'Educação' },
            { icon: 'bi-controller', title: 'Entretenimento', text: 'Lazer' },
            { icon: 'bi-bag-fill', title: 'Compras', text: 'Compras' },
            { icon: 'bi-phone-fill', title: 'Telefone', text: 'Telefone' },
            { icon: 'bi-lightning-charge-fill', title: 'Energia', text: 'Energia' },
            { icon: 'bi-droplet-fill', title: 'Água', text: 'Água' },
            { icon: 'bi-wifi', title: 'Internet', text: 'Internet' },
            { icon: 'bi-piggy-bank-fill', title: 'Poupança', text: 'Poupança' },
            { icon: 'bi-gift-fill', title: 'Presentes', text: 'Presentes' },
            { icon: 'bi-airplane-fill', title: 'Viagem', text: 'Viagem' },
            { icon: 'bi-briefcase-fill', title: 'Trabalho', text: 'Trabalho' },
            { icon: 'bi-cup-hot-fill', title: 'Café/Bebidas', text: 'Café' },
            { icon: 'bi-film', title: 'Cinema', text: 'Cinema' },
            { icon: 'bi-bicycle', title: 'Esporte', text: 'Esporte' },
            { icon: 'bi-tools', title: 'Manutenção', text: 'Manutenção' },
            { icon: 'bi-palette-fill', title: 'Arte/Hobby', text: 'Arte' },
            { icon: 'bi-cash-stack', title: 'Dinheiro', text: 'Dinheiro' },
            { icon: 'bi-credit-card-fill', title: 'Cartão', text: 'Cartão' },
            { icon: 'bi-bank', title: 'Banco', text: 'Banco' },
            { icon: 'bi-graph-up-arrow', title: 'Investimento', text: 'Investimento' }
        ];

        // Limpar grid existente (se houver)
        iconsGrid.innerHTML = '';

        // Adicionar ícones populares
        popularIcons.forEach((iconData, index) => {
            const iconElement = this.createIconElement(iconData);
            iconElement.style.animationDelay = `${index * 0.05}s`;
            iconsGrid.appendChild(iconElement);
        });
    },

    // ===== CRIAR ELEMENTO DE ÍCONE =====
    createIconElement(iconData) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'icon-option fade-in-up';
        iconDiv.setAttribute('data-icon', iconData.icon);
        iconDiv.setAttribute('title', iconData.title);
        iconDiv.setAttribute('tabindex', '0');
        
        iconDiv.innerHTML = `
            <i class="bi ${iconData.icon}"></i>
            <small>${iconData.text}</small>
        `;

        // Adicionar evento de teclado para acessibilidade
        iconDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectIcon(iconData.icon);
                this.closeIconModal();
            }
        });

        return iconDiv;
    },

    // ===== SELECIONAR ÍCONE =====
    selectIcon(iconClass) {
        const iconeInput = document.getElementById('icone');
        if (iconeInput) {
            iconeInput.value = iconClass;
            this.state.selectedIcon = iconClass;
            
            // Atualizar preview
            const iconPreview = document.getElementById('iconPreview');
            if (iconPreview) {
                iconPreview.className = `bi ${iconClass} fs-3`;
            }

            // Marcar como selecionado visualmente
            document.querySelectorAll('.icon-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            const selectedOption = document.querySelector(`[data-icon="${iconClass}"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }

            this.showToast('Ícone selecionado!', 'success');
        }
    },

    // ===== FECHAR MODAL DE ÍCONES =====
    closeIconModal() {
        const modal = document.getElementById('modalIcones');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    },

    // ===== MODAL DE CONFIRMAÇÃO =====
    setupConfirmationModal() {
        const modal = document.getElementById('modalConfirmarExclusao');
        if (!modal) return;

        modal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            const tipo = button.getAttribute('data-tipo') || 'item';
            const nome = button.getAttribute('data-nome') || '';
            const url = button.getAttribute('data-url') || '';
            
            const tipoElement = document.getElementById('tipoItem');
            const nomeElement = document.getElementById('nomeItem');
            const formElement = document.getElementById('formExclusao');
            const avisoCategoria = document.getElementById('avisoCategoria');
            
            if (tipoElement) tipoElement.textContent = tipo;
            if (nomeElement) nomeElement.textContent = nome;
            if (formElement) formElement.action = url;
            
            // Mostrar aviso específico para categorias
            if (avisoCategoria) {
                avisoCategoria.style.display = tipo === 'categoria' ? 'block' : 'none';
            }
        });
    },

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animar cards de categoria
        const categoriaCards = document.querySelectorAll('.categoria-card');
        categoriaCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');
        });

        // Animar estatísticas
        const estatisticaCards = document.querySelectorAll('.estatistica-card');
        estatisticaCards.forEach((card, index) => {
            card.style.animationDelay = `${(index * 0.1) + 0.3}s`;
            card.classList.add('slide-in-right');
        });
    },

    // ===== ANIMAÇÃO DE TRANSIÇÃO DE VISTA =====
    animateViewTransition(viewType) {
        const content = viewType === 'grid' ? 
            document.getElementById('gridViewContent') : 
            document.getElementById('listViewContent');
        
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                content.style.transition = 'all 0.3s ease-out';
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }, 50);
        }
    },

    // ===== SISTEMA DE TOAST =====
    setupToastSystem() {
        // Criar container de toast se não existir
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    },

    // ===== MOSTRAR TOAST =====
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast toast-custom ${type} show" role="alert">
                <div class="toast-header">
                    <i class="bi bi-${this.getToastIcon(type)} me-2 text-${type}"></i>
                    <strong class="me-auto">${this.getToastTitle(type)}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHTML);

        // Auto-remover após duração especificada
        setTimeout(() => {
            const toast = document.getElementById(toastId);
            if (toast) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    },

    // ===== HELPERS PARA TOAST =====
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || icons.info;
    },

    getToastTitle(type) {
        const titles = {
            'success': 'Sucesso',
            'error': 'Erro',
            'warning': 'Atenção',
            'info': 'Informação'
        };
        return titles[type] || titles.info;
    },

    // ===== INICIALIZAR PREVIEWS =====
    initializePreviews() {
        // Garantir que os previews estejam corretos na inicialização
        const corInput = document.getElementById('cor');
        const iconeInput = document.getElementById('icone');
        
        if (corInput) {
            this.state.previewColor = corInput.value || '#667eea';
        }
        
        if (iconeInput) {
            this.state.selectedIcon = iconeInput.value || 'bi-tag-fill';
        }
    },

    // ===== UTILITÁRIOS =====
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

    // ===== VALIDAÇÕES =====
    validateForm(formData) {
        const errors = [];
        
        if (!formData.get('nome') || formData.get('nome').trim() === '') {
            errors.push('Nome da categoria é obrigatório');
        }
        
        if (!formData.get('cor')) {
            errors.push('Cor da categoria é obrigatória');
        }
        
        if (!formData.get('icone') || formData.get('icone').trim() === '') {
            errors.push('Ícone da categoria é obrigatório');
        }
        
        return errors;
    },

    // ===== FUNÇÕES GLOBAIS PARA USO EM TEMPLATES =====
    confirmarExclusao(tipo, nome, url) {
        const modal = document.getElementById('modalConfirmarExclusao');
        if (modal) {
            const tipoElement = document.getElementById('tipoItem');
            const nomeElement = document.getElementById('nomeItem');
            const formElement = document.getElementById('formExclusao');
            const avisoCategoria = document.getElementById('avisoCategoria');
            
            if (tipoElement) tipoElement.textContent = tipo;
            if (nomeElement) nomeElement.textContent = nome;
            if (formElement) formElement.action = url;
            
            if (avisoCategoria) {
                avisoCategoria.style.display = tipo === 'categoria' ? 'block' : 'none';
            }
            
            new bootstrap.Modal(modal).show();
        }
    },

    // ===== GETTER PARA ESTADO =====
    getState() {
        return { ...this.state };
    },

    // ===== SETTER PARA ESTADO =====
    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
};

// ===== FUNÇÃO GLOBAL PARA CONFIRMAÇÃO (compatibilidade com template) =====
window.confirmarExclusao = function(tipo, nome, url) {
    CategoriasManager.confirmarExclusao(tipo, nome, url);
};

// ===== INICIALIZAÇÃO QUANDO DOM ESTIVER PRONTO =====
document.addEventListener('DOMContentLoaded', function() {
    CategoriasManager.init();
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoriasManager;
}