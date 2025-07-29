// ===== MÓDULO DE GERENCIAMENTO DE CARTÕES =====

const CartoesManager = {
    
    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupImagePreview();
        this.setupModalInativacao();
        this.setupAnimations();
    },

    // ===== PREVIEW DE UPLOAD DE IMAGEM =====
    setupImagePreview() {
        const logoInput = document.getElementById('logo_imagem');
        const preview = document.querySelector('.upload-preview');
        
        if (!logoInput || !preview) return;

        logoInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" 
                             style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                CartoesManager.resetPreview();
            }
        });
    },

    // ===== RESET DO PREVIEW =====
    resetPreview() {
        const preview = document.querySelector('.upload-preview');
        if (!preview) return;

        preview.innerHTML = `
            <div class="preview-placeholder">
                <i class="bi bi-image fs-1 text-muted"></i>
                <p class="text-muted mb-0">Pré-visualização da logo</p>
            </div>
        `;
    },

    // ===== MODAL DE INATIVAÇÃO =====
    setupModalInativacao() {
        const modalInativar = document.getElementById('modalInativarCartao');
        if (!modalInativar) return;

        modalInativar.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const cartaoId = button.getAttribute('data-cartao-id');
            const cartaoNome = button.getAttribute('data-cartao-nome');
            
            // Atualizar conteúdo do modal
            const nomeCartaoModal = document.getElementById('nomeCartaoModal');
            const formInativar = document.getElementById('formInativarCartao');
            
            if (nomeCartaoModal) {
                nomeCartaoModal.textContent = cartaoNome;
            }
            
            if (formInativar) {
                formInativar.action = `/cartoes/inativar/${cartaoId}`;
            }
        });
    },

    // ===== ANIMAÇÕES =====
    setupAnimations() {
        // Animações dos cartões
        const cartaoCards = document.querySelectorAll('.cartao-card');
        cartaoCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
        
        // Animações das estatísticas
        const estatisticaCards = document.querySelectorAll('.estatistica-card');
        estatisticaCards.forEach((card, index) => {
            card.style.animationDelay = `${(index * 0.1) + 0.3}s`;
            card.classList.add('slide-in');
        });
    },

    // ===== UTILITÁRIOS =====
    showNotification(message, type = 'info') {
        // Função para mostrar notificações (pode ser expandida no futuro)
        console.log(`${type.toUpperCase()}: ${message}`);
    },

    // ===== VALIDAÇÕES =====
    validateForm(formData) {
        const errors = [];
        
        if (!formData.get('nome') || formData.get('nome').trim() === '') {
            errors.push('Nome do cartão é obrigatório');
        }
        
        const diaVencimento = parseInt(formData.get('dia_vencimento'));
        if (!diaVencimento || diaVencimento < 1 || diaVencimento > 31) {
            errors.push('Dia de vencimento deve estar entre 1 e 31');
        }
        
        return errors;
    }
};

// ===== INICIALIZAÇÃO QUANDO DOM ESTIVER PRONTO =====
document.addEventListener('DOMContentLoaded', function() {
    CartoesManager.init();
});

// ===== EXPORT PARA USO EM OUTROS MÓDULOS (SE NECESSÁRIO) =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartoesManager;
}