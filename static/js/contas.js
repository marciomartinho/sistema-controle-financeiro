// ===== MÓDULO DE GERENCIAMENTO DE CONTAS =====

const ContasManager = {
    
    // ===== ESTADO DA APLICAÇÃO =====
    state: {
        currentFilter: 'all',
        sortBy: 'nome',
        sortOrder: 'asc'
    },

    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupFormValidation();
        this.setupAnimations();
        this.setupToggleInvestimento();
        this.setupFilePreview();
        this.setupSearch();
        this.setupSort();
    },

    // ===== TOGGLE CAMPO INVESTIMENTO =====
    setupToggleInvestimento() {
        const tipoContaSelect = document.getElementById('tipo_conta');
        if (tipoContaSelect) {
            tipoContaSelect.addEventListener('change', this.toggleInvestimento);
            // Inicializar o estado correto
            this.toggleInvestimento();
        }
    },

    toggleInvestimento() {
        const tipoConta = document.getElementById('tipo_conta').value;
        const campoInvestimento = document.getElementById('campo_tipo_investimento');
        const inputInvestimento = document.getElementById('tipo_investimento');
        
        if (tipoConta === 'Investimento') {
            campoInvestimento.style.display = 'block';
            inputInvestimento.required = true;
        } else {
            campoInvestimento.style.display = 'none';
            inputInvestimento.required = false;
            inputInvestimento.value = '';
        }
    },

    // ===== PREVIEW DE ARQUIVO =====
    setupFilePreview() {
        const fileInput = document.getElementById('logo_imagem');
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.previewFile(file);
            }
        });
    },

    previewFile(file) {
        // Validar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Tipo de arquivo não suportado. Use JPG, PNG ou GIF.', 'error');
            return;
        }

        // Validar tamanho (máximo 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            this.showNotification('Arquivo muito grande. Máximo 2MB.', 'error');
            return;
        }

        // Criar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.createPreviewElement(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    },

    createPreviewElement(src, fileName) {
        // Remover preview anterior se existir
        const existingPreview = document.getElementById('file-preview');
        if (existingPreview) {
            existingPreview.remove();
        }

        const fileInput = document.getElementById('logo_imagem');
        const previewDiv = document.createElement('div');
        previewDiv.id = 'file-preview';
        previewDiv.className = 'mt-2 d-flex align-items-center gap-2';
        
        previewDiv.innerHTML = `
            <img src="${src}" alt="Preview" class="rounded" style="width: 40px; height: 40px; object-fit: cover; border: 2px solid var(--border-color);">
            <div class="flex-grow-1">
                <small class="text-muted d-block">${fileName}</small>
                <small class="text-success">✓ Imagem carregada</small>
            </div>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="ContasManager.removePreview()">
                <i class="bi bi-x"></i>
            </button>
        `;

        fileInput.parentNode.appendChild(previewDiv);
    },

    removePreview() {
        const preview = document.getElementById('file-preview');
        const fileInput = document.getElementById('logo_imagem');
        
        if (preview) {
            preview.remove();
        }
        if (fileInput) {
            fileInput.value = '';
        }
    },

    // ===== VALIDAÇÃO DO FORMULÁRIO =====
    setupFormValidation() {
        const form = document.querySelector('form[action*="gerenciar_contas"]');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            if (!this.validateForm(form)) {
                e.preventDefault();
            }
        });

        // Validação em tempo real
        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    },

    validateForm(form) {
        const formData = new FormData(form);
        const errors = [];

        // Validar nome
        const nome = formData.get('nome');
        if (!nome || nome.trim().length < 3) {
            errors.push('Nome da conta deve ter pelo menos 3 caracteres');
        }

        // Validar saldo
        const saldo = parseFloat(formData.get('saldo_inicial'));
        if (isNaN(saldo)) {
            errors.push('Saldo inicial deve ser um número válido');
        }

        // Validar tipo de investimento se necessário
        const tipoConta = formData.get('tipo_conta');
        const tipoInvestimento = formData.get('tipo_investimento');
        if (tipoConta === 'Investimento' && (!tipoInvestimento || tipoInvestimento.trim() === '')) {
            errors.push('Tipo de investimento é obrigatório');
        }

        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return false;
        }

        return true;
    },

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let message = '';

        switch (field.type) {
            case 'text':
                if (field.required && value.length < 3) {
                    isValid = false;
                    message = 'Mínimo 3 caracteres';
                }
                break;
            case 'number':
                if (field.required && (isNaN(parseFloat(value)) || value === '')) {
                    isValid = false;
                    message = 'Número válido necessário';
                }
                break;
        }

        this.showFieldValidation(field, isValid, message);
        return isValid;
    },

    showFieldValidation(field, isValid, message) {
        // Remover feedback anterior
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        field.classList.remove('is-valid', 'is-invalid');

        if (!isValid) {
            field.classList.add('is-invalid');
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = message;
            field.parentNode.appendChild(feedback);
        } else if (field.value.trim() !== '') {
            field.classList.add('is-valid');
        }
    },

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    },

    showValidationErrors(errors) {
        const message = errors.join('\n');
        this.showNotification(message, 'error');
    },

    // ===== PESQUISA E FILTROS =====
    setupSearch() {
        // Implementar busca se necessário no futuro
        const searchInput = document.getElementById('searchContas');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.filterContas(e.target.value);
            }, 300));
        }
    },

    filterContas(searchTerm) {
        const contaItems = document.querySelectorAll('.conta-item');
        const searchLower = searchTerm.toLowerCase();
        
        contaItems.forEach(item => {
            const nome = item.querySelector('.conta-nome')?.textContent.toLowerCase();
            const tipo = item.querySelector('small')?.textContent.toLowerCase();
            
            const shouldShow = !searchTerm || 
                              (nome && nome.includes(searchLower)) ||
                              (tipo && tipo.includes(searchLower));
            
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    },

    // ===== ORDENAÇÃO =====
    setupSort() {
        // Implementar ordenação se necessário
    },

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animar cards de resumo
        const resumoCards = document.querySelectorAll('.resumo-card');
        resumoCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
        
        // Animar itens das contas
        const contaItems = document.querySelectorAll('.conta-item');
        contaItems.forEach((item, index) => {
            item.style.animationDelay = `${(index * 0.05) + 0.3}s`;
            item.classList.add('slide-in');
        });

        // Animar formulário
        const form = document.querySelector('.card');
        if (form) {
            form.style.animationDelay = '0.2s';
            form.classList.add('fade-in');
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

    // ===== FORMATAÇÃO =====
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // ===== FOCO NO PRIMEIRO CAMPO =====
    focusFirstField() {
        const firstInput = document.getElementById('nome');
        if (firstInput) {
            firstInput.focus();
        }
    },

    // ===== GETTERS E SETTERS DE ESTADO =====
    getState() {
        return { ...this.state };
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }
};

// ===== FUNÇÃO GLOBAL PARA TOGGLE (compatibilidade) =====
window.toggleInvestimento = function() {
    ContasManager.toggleInvestimento();
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    ContasManager.init();
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContasManager;
}