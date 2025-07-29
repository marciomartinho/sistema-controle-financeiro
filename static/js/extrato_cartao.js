// ===== MÓDULO DE GERENCIAMENTO DE EXTRATO DO CARTÃO =====

const ExtratoCartaoManager = {
    
    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupViewToggle();
        this.setupModals();
        this.setupSubcategoriaLoaders();
        this.setupAnimations();
    },

    // ===== TOGGLE ENTRE VISTAS =====
    setupViewToggle() {
        const compactView = document.getElementById('compactView');
        const detailedView = document.getElementById('detailedView');
        const compactContent = document.getElementById('compactViewContent');
        const detailedContent = document.getElementById('detailedViewContent');

        if (!compactView || !detailedView || !compactContent || !detailedContent) return;

        compactView.addEventListener('change', function() {
            if (this.checked) {
                compactContent.style.display = 'block';
                detailedContent.style.display = 'none';
            }
        });
        
        detailedView.addEventListener('change', function() {
            if (this.checked) {
                compactContent.style.display = 'none';
                detailedContent.style.display = 'block';
            }
        });
    },

    // ===== CONFIGURAÇÃO DE MODAIS =====
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
            
            // Preencher campos do modal
            this.setModalValue('edit_unico_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalValue('edit_unico_descricao', button.getAttribute('data-descricao'));
            this.setModalValue('edit_unico_valor', button.getAttribute('data-valor'));
            this.setModalValue('edit_unico_data', button.getAttribute('data-vencimento'));
            this.setModalValue('edit_unico_categoria', button.getAttribute('data-categoria-id'));
            this.setModalValue('edit_unico_cartao', button.getAttribute('data-cartao-id'));
            
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
            
            // Preencher campos do modal
            this.setModalValue('edit_rec_lancamento_id', button.getAttribute('data-lancamento-id'));
            this.setModalValue('edit_rec_recorrencia_id', button.getAttribute('data-recorrencia-id'));
            this.setModalValue('edit_rec_descricao', button.getAttribute('data-descricao'));
            this.setModalValue('edit_rec_valor', button.getAttribute('data-valor'));
            this.setModalValue('edit_rec_data', button.getAttribute('data-vencimento'));
            this.setModalValue('edit_rec_categoria', button.getAttribute('data-categoria-id'));
            this.setModalValue('edit_rec_cartao', button.getAttribute('data-cartao-id'));
            
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

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animar lançamentos conforme aparecem
        const lancamentoItems = document.querySelectorAll('.lancamento-item');
        lancamentoItems.forEach((item, index) => {
            item.style.setProperty('--animation-order', index);
        });

        // Animar cards de estatística
        const estatisticaCards = document.querySelectorAll('.estatistica-card');
        estatisticaCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
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

    showNotification(message, type = 'info') {
        // Sistema de notificações simples
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Futuramente pode ser expandido para usar toast/alert real
        if (type === 'error') {
            alert(`Erro: ${message}`);
        }
    },

    // ===== VALIDAÇÕES =====
    validateLancamentoForm(formData) {
        const errors = [];
        
        if (!formData.get('descricao') || formData.get('descricao').trim() === '') {
            errors.push('Descrição é obrigatória');
        }
        
        const valor = parseFloat(formData.get('valor'));
        if (!valor || valor <= 0) {
            errors.push('Valor deve ser maior que zero');
        }
        
        if (!formData.get('data_vencimento')) {
            errors.push('Data de vencimento é obrigatória');
        }
        
        if (!formData.get('subcategoria_id')) {
            errors.push('Subcategoria é obrigatória');
        }
        
        return errors;
    },

    // ===== FILTROS E PESQUISA =====
    setupFilters() {
        // Função para implementar filtros futuros
        const searchInput = document.getElementById('searchLancamentos');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.filterLancamentos(e.target.value);
            }, 300));
        }
    },

    filterLancamentos(searchTerm) {
        const lancamentoItems = document.querySelectorAll('.lancamento-item');
        const searchLower = searchTerm.toLowerCase();
        
        lancamentoItems.forEach(item => {
            const descricao = item.querySelector('.lancamento-descricao')?.textContent.toLowerCase();
            const shouldShow = !searchTerm || (descricao && descricao.includes(searchLower));
            
            item.style.display = shouldShow ? 'block' : 'none';
        });
    },

    // ===== DEBOUNCE UTILITY =====
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

    // ===== FORMATAÇÃO DE VALORES =====
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    },

    // ===== ESTADO DA APLICAÇÃO =====
    state: {
        currentView: 'compact',
        currentCartao: null,
        currentMes: null,
        currentAno: null
    },

    updateState(key, value) {
        this.state[key] = value;
    },

    getState(key) {
        return this.state[key];
    }
};

// ===== INICIALIZAÇÃO QUANDO DOM ESTIVER PRONTO =====
document.addEventListener('DOMContentLoaded', function() {
    ExtratoCartaoManager.init();
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtratoCartaoManager;
}