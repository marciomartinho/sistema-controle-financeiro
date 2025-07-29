// ===== MÓDULO DE GERENCIAMENTO DE LANÇAMENTOS =====

const LancamentosManager = {
    
    // ===== ESTADO DA APLICAÇÃO =====
    state: {
        tipoAtual: 'Despesa',
        categoriaAtual: null,
        subcategoriaAtual: null,
        isLoading: false
    },

    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupFormEvents();
        this.setupModals();
        this.setupAnimations();
        this.setupValidation();
        this.initializeForm();
    },

    // ===== CONFIGURAÇÃO DE EVENTOS DO FORMULÁRIO =====
    setupFormEvents() {
        // Eventos de mudança de tipo de lançamento
        document.querySelectorAll('input[name="tipo_lancamento"]').forEach(elem => {
            elem.addEventListener('change', () => this.toggleLancamentoFields());
        });

        // Eventos de recorrência para receita/despesa
        document.querySelectorAll('input[name="recorrencia_tipo"]').forEach(elem => {
            elem.addEventListener('change', (e) => this.toggleParcelamentoFields(e));
        });

        // Eventos de recorrência para cartão de crédito
        document.querySelectorAll('input[name="recorrencia_tipo_cartao"]').forEach(elem => {
            elem.addEventListener('change', (e) => this.toggleParcelamentoCartaoFields(e));
        });

        // Evento de mudança de categoria (receita/despesa)
        const categoriaSelect = document.getElementById('categoria');
        if (categoriaSelect) {
            categoriaSelect.addEventListener('change', () => this.carregarSubcategorias());
        }

        // Evento de mudança de categoria (cartão de crédito)
        const categoriaCartaoSelect = document.getElementById('categoria_cartao');
        if (categoriaCartaoSelect) {
            categoriaCartaoSelect.addEventListener('change', () => this.carregarSubcategoriasCartao());
        }

        // Validação em tempo real
        this.setupRealTimeValidation();
    },

    // ===== TOGGLE ENTRE TIPOS DE LANÇAMENTO =====
    toggleLancamentoFields() {
        const tipo = document.querySelector('input[name="tipo_lancamento"]:checked')?.value || 'Despesa';
        this.state.tipoAtual = tipo;
        
        const camposRD = document.getElementById('campos_receita_despesa');
        const camposTransf = document.getElementById('campos_transferencia');
        const camposCartao = document.getElementById('campos_cartao_credito');
        
        // Campos de Receita/Despesa
        const categoria = document.getElementById('categoria');
        const subcategoria = document.getElementById('subcategoria');
        const contaRD = document.getElementById('conta_id_rd');

        // Campos de Transferência
        const contaOrigem = document.getElementById('conta_origem_id');
        const contaDestino = document.getElementById('conta_destino_id');

        // Campos de Cartão de Crédito
        const categoriaCartao = document.getElementById('categoria_cartao');
        const subcategoriaCartao = document.getElementById('subcategoria_cartao');
        const cartaoCredito = document.getElementById('cartao_credito_id');
        const faturaInicioMes = document.getElementById('fatura_inicio_mes');

        // Resetar todos os campos com animação
        this.hideAllSections([camposRD, camposTransf, camposCartao]);

        // Desabilitar e limpar required de todos os campos
        this.resetFieldRequirements({
            categoria, subcategoria, contaRD,
            contaOrigem, contaDestino,
            categoriaCartao, subcategoriaCartao, cartaoCredito, faturaInicioMes
        });

        // Mostrar seção apropriada com delay para animação
        setTimeout(() => {
            if (tipo === 'Transferencia') {
                this.showSection(camposTransf);
                this.enableFields([contaOrigem, contaDestino], true);
            } else if (tipo === 'CartaoCredito') {
                this.showSection(camposCartao);
                this.enableFields([categoriaCartao, cartaoCredito, faturaInicioMes], true);
                this.subcategoriaCartao = subcategoriaCartao;
                this.subcategoriaCartao.required = true;
                
                // Definir mês padrão (próximo mês)
                this.setDefaultMonth(faturaInicioMes);
            } else {
                // Receita ou Despesa
                this.showSection(camposRD);
                this.enableFields([categoria, subcategoria, contaRD], true);
            }
        }, 300);
    },

    // ===== TOGGLE CAMPOS DE PARCELAMENTO =====
    toggleParcelamentoFields(event) {
        const camposParcelamento = document.getElementById('campos_parcelamento');
        const display = event.target.value === 'parcelada' ? 'flex' : 'none';
        
        if (display === 'flex') {
            this.showElement(camposParcelamento);
            camposParcelamento.style.display = 'flex';
        } else {
            this.hideElement(camposParcelamento);
        }
    },

    toggleParcelamentoCartaoFields(event) {
        const camposParcelamentoCartao = document.getElementById('campos_parcelamento_cartao');
        const display = event.target.value === 'parcelada' ? 'flex' : 'none';
        
        if (display === 'flex') {
            this.showElement(camposParcelamentoCartao);
            camposParcelamentoCartao.style.display = 'flex';
        } else {
            this.hideElement(camposParcelamentoCartao);
        }
    },

    // ===== CARREGAMENTO DE SUBCATEGORIAS =====
    carregarSubcategorias() {
        const categoriaSelect = document.getElementById('categoria');
        const subcategoriaSelect = document.getElementById('subcategoria');
        
        if (!categoriaSelect || !subcategoriaSelect) return;
        
        const categoriaId = categoriaSelect.value;
        this.state.categoriaAtual = categoriaId;
        
        this.loadSubcategorias(categoriaId, subcategoriaSelect);
    },

    carregarSubcategoriasCartao() {
        const categoriaSelect = document.getElementById('categoria_cartao');
        const subcategoriaSelect = document.getElementById('subcategoria_cartao');
        
        if (!categoriaSelect || !subcategoriaSelect) return;
        
        const categoriaId = categoriaSelect.value;
        this.loadSubcategorias(categoriaId, subcategoriaSelect);
    },

    loadSubcategorias(categoriaId, subcategoriaSelect) {
        // Estado de loading
        subcategoriaSelect.innerHTML = '<option value="">Carregando...</option>';
        subcategoriaSelect.disabled = true;
        this.addLoadingClass(subcategoriaSelect);
        
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
                        subcategoriaSelect.appendChild(option);
                    });
                    
                    subcategoriaSelect.disabled = false;
                    this.removeLoadingClass(subcategoriaSelect);
                    this.animateSuccess(subcategoriaSelect);
                })
                .catch(error => {
                    console.error('Erro ao carregar subcategorias:', error);
                    subcategoriaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
                    this.removeLoadingClass(subcategoriaSelect);
                    this.showNotification('Erro ao carregar subcategorias', 'error');
                });
        } else {
            subcategoriaSelect.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
            subcategoriaSelect.disabled = false;
            this.removeLoadingClass(subcategoriaSelect);
        }
    },

    // ===== CONFIGURAÇÃO DE MODAIS =====
    setupModals() {
        this.configurarModalExclusao();
        this.configurarModalTransferencia();
    },

    configurarModalExclusao() {
        const modalExcluir = document.getElementById('modalExcluir');
        if (!modalExcluir) return;

        modalExcluir.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            const tipoItem = button.getAttribute('data-tipo-item');
            const descricao = button.getAttribute('data-descricao');
            const lancamentoId = button.getAttribute('data-lancamento-id');
            const recorrenciaId = button.getAttribute('data-recorrencia-id');
            const vencimento = button.getAttribute('data-vencimento');
            
            const descricaoModal = modalExcluir.querySelector('#descricaoModal');
            const opcoesExclusao = modalExcluir.querySelector('#opcoesExclusao');
            
            descricaoModal.textContent = descricao;
            modalExcluir.querySelector('#lancamento_id_modal').value = lancamentoId;
            modalExcluir.querySelector('#recorrencia_id_modal').value = recorrenciaId;
            
            opcoesExclusao.innerHTML = '';

            if (tipoItem === 'unico') {
                opcoesExclusao.innerHTML = `
                    <input type="hidden" name="tipo_exclusao" value="unico">
                    <div class="alert alert-danger border-0">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Esta ação não pode ser desfeita.
                    </div>
                `;
            } else if (tipoItem === 'recorrencia') {
                opcoesExclusao.innerHTML = `
                    <div class="mb-3">
                        <h6 class="text-primary mb-3">Escolha o escopo da exclusão:</h6>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="tipo_exclusao" id="excluirFuturos" value="futuros_recorrencia" checked>
                            <label class="form-check-label" for="excluirFuturos">
                                <i class="bi bi-calendar-range me-1"></i>
                                Excluir este e todos os futuros (a partir de ${vencimento})
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="tipo_exclusao" id="excluirTodos" value="todos_recorrencia">
                            <label class="form-check-label" for="excluirTodos">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                Excluir TODA a recorrência (passados e futuros)
                            </label>
                        </div>
                    </div>
                `;
            }
        });
    },

    configurarModalTransferencia() {
        const modalExcluirTransferencia = document.getElementById('modalExcluirTransferencia');
        if (!modalExcluirTransferencia) return;

        modalExcluirTransferencia.addEventListener('show.bs.modal', event => {
            const button = event.relatedTarget;
            const transferenciaId = button.getAttribute('data-transferencia-id');
            const contaOrigem = button.getAttribute('data-conta-origem');
            const contaDestino = button.getAttribute('data-conta-destino');
            const valor = button.getAttribute('data-valor');
            
            modalExcluirTransferencia.querySelector('#contaOrigemModal').textContent = contaOrigem;
            modalExcluirTransferencia.querySelector('#contaDestinoModal').textContent = contaDestino;
            modalExcluirTransferencia.querySelector('#valorModal').textContent = valor;
            
            const form = modalExcluirTransferencia.querySelector('#formExcluirTransferencia');
            form.action = `/lancamentos/deletar_transferencia/${transferenciaId}`;
        });
    },

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animar cards de tipo de lançamento
        const tipoCards = document.querySelectorAll('.check-card');
        tipoCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');
        });

        // Animar tabela
        const tabela = document.querySelector('.table-responsive');
        if (tabela) {
            tabela.style.animationDelay = '0.5s';
            tabela.classList.add('slide-in-left');
        }
    },

    // ===== VALIDAÇÃO =====
    setupValidation() {
        const form = document.getElementById('form-lancamento');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            if (!this.validateForm()) {
                e.preventDefault();
                this.showNotification('Por favor, corrija os erros no formulário', 'error');
            }
        });
    },

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    },

    validateForm() {
        const tipo = this.state.tipoAtual;
        let isValid = true;
        const errors = [];

        // Validação básica
        const descricao = document.getElementById('descricao');
        const valor = document.getElementById('valor');
        const dataVencimento = document.getElementById('data_vencimento');

        if (!descricao?.value?.trim()) {
            errors.push('Descrição é obrigatória');
            this.showFieldError(descricao, 'Descrição é obrigatória');
            isValid = false;
        }

        if (!valor?.value || parseFloat(valor.value) <= 0) {
            errors.push('Valor deve ser maior que zero');
            this.showFieldError(valor, 'Valor deve ser maior que zero');
            isValid = false;
        }

        if (!dataVencimento?.value) {
            errors.push('Data é obrigatória');
            this.showFieldError(dataVencimento, 'Data é obrigatória');
            isValid = false;
        }

        // Validações específicas por tipo
        if (tipo === 'Transferencia') {
            const contaOrigem = document.getElementById('conta_origem_id');
            const contaDestino = document.getElementById('conta_destino_id');

            if (!contaOrigem?.value) {
                errors.push('Conta de origem é obrigatória');
                this.showFieldError(contaOrigem, 'Selecione a conta de origem');
                isValid = false;
            }

            if (!contaDestino?.value) {
                errors.push('Conta de destino é obrigatória');
                this.showFieldError(contaDestino, 'Selecione a conta de destino');
                isValid = false;
            }

            if (contaOrigem?.value === contaDestino?.value && contaOrigem?.value) {
                errors.push('Contas de origem e destino devem ser diferentes');
                this.showFieldError(contaDestino, 'Deve ser diferente da conta de origem');
                isValid = false;
            }
        } else if (tipo === 'CartaoCredito') {
            const categoriaCartao = document.getElementById('categoria_cartao');
            const subcategoriaCartao = document.getElementById('subcategoria_cartao');
            const cartaoCredito = document.getElementById('cartao_credito_id');

            if (!categoriaCartao?.value) {
                errors.push('Categoria é obrigatória');
                this.showFieldError(categoriaCartao, 'Selecione uma categoria');
                isValid = false;
            }

            if (!subcategoriaCartao?.value) {
                errors.push('Subcategoria é obrigatória');
                this.showFieldError(subcategoriaCartao, 'Selecione uma subcategoria');
                isValid = false;
            }

            if (!cartaoCredito?.value) {
                errors.push('Cartão de crédito é obrigatório');
                this.showFieldError(cartaoCredito, 'Selecione um cartão');
                isValid = false;
            }
        } else {
            // Receita ou Despesa
            const categoria = document.getElementById('categoria');
            const subcategoria = document.getElementById('subcategoria');
            const conta = document.getElementById('conta_id_rd');

            if (!categoria?.value) {
                errors.push('Categoria é obrigatória');
                this.showFieldError(categoria, 'Selecione uma categoria');
                isValid = false;
            }

            if (!subcategoria?.value) {
                errors.push('Subcategoria é obrigatória');
                this.showFieldError(subcategoria, 'Selecione uma subcategoria');
                isValid = false;
            }

            if (!conta?.value) {
                errors.push('Conta é obrigatória');
                this.showFieldError(conta, 'Selecione uma conta');
                isValid = false;
            }
        }

        return isValid;
    },

    validateField(field) {
        const value = field.value?.trim();
        let isValid = true;
        let message = '';

        switch (field.type) {
            case 'text':
                if (field.required && (!value || value.length < 3)) {
                    isValid = false;
                    message = 'Mínimo 3 caracteres';
                }
                break;
            case 'number':
                if (field.required && (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
                    isValid = false;
                    message = 'Valor deve ser maior que zero';
                }
                break;
            case 'date':
                if (field.required && !value) {
                    isValid = false;
                    message = 'Data é obrigatória';
                }
                break;
            default:
                if (field.required && !value) {
                    isValid = false;
                    message = 'Campo obrigatório';
                }
        }

        if (isValid) {
            this.clearFieldError(field);
        } else {
            this.showFieldError(field, message);
        }

        return isValid;
    },

    showFieldError(field, message) {
        this.clearFieldError(field);
        field.classList.add('is-invalid');
        
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    },

    clearFieldError(field) {
        field.classList.remove('is-invalid', 'is-valid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    },

    // ===== UTILITÁRIOS =====
    hideAllSections(sections) {
        sections.forEach(section => {
            if (section) {
                this.hideElement(section);
            }
        });
    },

    showSection(section) {
        if (section) {
            this.showElement(section);
        }
    },

    hideElement(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    },

    showElement(element) {
        element.style.display = 'block';
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    },

    resetFieldRequirements(fields) {
        Object.values(fields).forEach(field => {
            if (field) {
                field.required = false;
                field.disabled = true;
                this.clearFieldError(field);
            }
        });
    },

    enableFields(fields, required = false) {
        fields.forEach(field => {
            if (field) {
                field.disabled = false;
                field.required = required;
            }
        });
    },

    setDefaultMonth(faturaInicioMes) {
        const hoje = new Date();
        const proximoMes = hoje.getMonth() + 2; // +1 para próximo mês, +1 porque getMonth() é 0-based
        const mesDefault = proximoMes > 12 ? 1 : proximoMes;
        faturaInicioMes.value = mesDefault;
    },

    addLoadingClass(element) {
        element.classList.add('loading-skeleton');
    },

    removeLoadingClass(element) {
        element.classList.remove('loading-skeleton');
    },

    animateSuccess(element) {
        element.classList.add('is-valid');
        setTimeout(() => {
            element.classList.remove('is-valid');
        }, 2000);
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

    // ===== INICIALIZAÇÃO DO FORMULÁRIO =====
    initializeForm() {
        // Definir data padrão como hoje
        const dataVencimento = document.getElementById('data_vencimento');
        if (dataVencimento && !dataVencimento.value) {
            const hoje = new Date();
            const dataFormatada = hoje.toISOString().split('T')[0];
            dataVencimento.value = dataFormatada;
        }

        // Inicializar estado do formulário
        this.toggleLancamentoFields();
    },

    // ===== GETTERS E SETTERS DE ESTADO =====
    getState() {
        return { ...this.state };
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
};

// ===== FUNÇÕES GLOBAIS PARA COMPATIBILIDADE =====
window.toggleLancamentoFields = function() {
    LancamentosManager.toggleLancamentoFields();
};

window.toggleParcelamentoFields = function(event) {
    LancamentosManager.toggleParcelamentoFields(event);
};

window.toggleParcelamentoCartaoFields = function(event) {
    LancamentosManager.toggleParcelamentoCartaoFields(event);
};

window.carregarSubcategorias = function() {
    LancamentosManager.carregarSubcategorias();
};

window.carregarSubcategoriasCartao = function() {
    LancamentosManager.carregarSubcategoriasCartao();
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    LancamentosManager.init();
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LancamentosManager;
}