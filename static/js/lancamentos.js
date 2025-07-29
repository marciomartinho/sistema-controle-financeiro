// ===== GERENCIAMENTO DE FORMULÁRIO =====

function toggleLancamentoFields() {
    const tipo = document.querySelector('input[name="tipo_lancamento"]:checked').value;
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

    // Resetar todos os campos
    camposRD.style.display = 'none';
    camposTransf.style.display = 'none';
    camposCartao.style.display = 'none';

    // Desabilitar todos os campos
    categoria.required = false;
    subcategoria.required = false;
    contaRD.required = false;
    contaOrigem.required = false;
    contaOrigem.disabled = true;
    contaDestino.required = false;
    contaDestino.disabled = true;
    categoriaCartao.required = false;
    categoriaCartao.disabled = true;
    subcategoriaCartao.required = false;
    subcategoriaCartao.disabled = true;
    cartaoCredito.required = false;
    cartaoCredito.disabled = true;
    faturaInicioMes.required = false;
    faturaInicioMes.disabled = true;

    if (tipo === 'Transferencia') {
        camposTransf.style.display = 'block';
        contaOrigem.required = true;
        contaOrigem.disabled = false;
        contaDestino.required = true;
        contaDestino.disabled = false;
    } else if (tipo === 'CartaoCredito') {
        camposCartao.style.display = 'block';
        categoriaCartao.required = true;
        categoriaCartao.disabled = false;
        subcategoriaCartao.required = true;
        cartaoCredito.required = true;
        cartaoCredito.disabled = false;
        faturaInicioMes.required = true;
        faturaInicioMes.disabled = false;
        
        // Definir mês padrão (próximo mês)
        const hoje = new Date();
        const proximoMes = hoje.getMonth() + 2; // +1 para próximo mês, +1 porque getMonth() é 0-based
        const mesDefault = proximoMes > 12 ? 1 : proximoMes;
        faturaInicioMes.value = mesDefault;
    } else {
        // Receita ou Despesa
        camposRD.style.display = 'block';
        categoria.required = true;
        subcategoria.required = true;
        contaRD.required = true;
    }
}

function toggleParcelamentoFields(event) {
    const display = event.target.value === 'parcelada' ? 'flex' : 'none';
    document.getElementById('campos_parcelamento').style.display = display;
}

function toggleParcelamentoCartaoFields(event) {
    const display = event.target.value === 'parcelada' ? 'flex' : 'none';
    document.getElementById('campos_parcelamento_cartao').style.display = display;
}

function carregarSubcategorias() {
    const categoriaId = this.value;
    const subcategoriaSelect = document.getElementById('subcategoria');
    
    subcategoriaSelect.innerHTML = '<option value="">Carregando...</option>';
    subcategoriaSelect.disabled = true;
    
    if (categoriaId) {
        fetch(`/api/subcategorias/${categoriaId}`)
            .then(response => response.json())
            .then(data => {
                subcategoriaSelect.innerHTML = '<option value="">Selecione...</option>';
                data.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nome;
                    subcategoriaSelect.appendChild(option);
                });
                subcategoriaSelect.disabled = false;
            })
            .catch(error => {
                console.error('Erro ao carregar subcategorias:', error);
                subcategoriaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            });
    } else {
        subcategoriaSelect.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
    }
}

function carregarSubcategoriasCartao() {
    const categoriaId = this.value;
    const subcategoriaSelect = document.getElementById('subcategoria_cartao');
    
    subcategoriaSelect.innerHTML = '<option value="">Carregando...</option>';
    subcategoriaSelect.disabled = true;
    
    if (categoriaId) {
        fetch(`/api/subcategorias/${categoriaId}`)
            .then(response => response.json())
            .then(data => {
                subcategoriaSelect.innerHTML = '<option value="">Selecione...</option>';
                data.forEach(sub => {
                    const option = document.createElement('option');
                    option.value = sub.id;
                    option.textContent = sub.nome;
                    subcategoriaSelect.appendChild(option);
                });
                subcategoriaSelect.disabled = false;
            })
            .catch(error => {
                console.error('Erro ao carregar subcategorias do cartão:', error);
                subcategoriaSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            });
    } else {
        subcategoriaSelect.innerHTML = '<option value="">Selecione uma categoria primeiro</option>';
    }
}

// ===== GERENCIAMENTO DE MODAIS =====

function configurarModalExclusao() {
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
                <p class="text-danger">Esta ação não pode ser desfeita.</p>
            `;
        } else if (tipoItem === 'recorrencia') {
            opcoesExclusao.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="tipo_exclusao" id="excluirFuturos" value="futuros_recorrencia" checked>
                    <label class="form-check-label" for="excluirFuturos">
                        Excluir este e todos os futuros (a partir de ${vencimento})
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="tipo_exclusao" id="excluirTodos" value="todos_recorrencia">
                    <label class="form-check-label" for="excluirTodos">
                        Excluir TODA a recorrência (passados e futuros)
                    </label>
                </div>
            `;
        }
    });
}

function configurarModalTransferencia() {
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
}

// ===== INICIALIZAÇÃO =====

function inicializarEventos() {
    // Eventos de mudança de tipo de lançamento
    document.querySelectorAll('input[name="tipo_lancamento"]').forEach(elem => {
        elem.addEventListener('change', toggleLancamentoFields);
    });

    // Eventos de recorrência para receita/despesa
    document.querySelectorAll('input[name="recorrencia_tipo"]').forEach(elem => {
        elem.addEventListener('change', toggleParcelamentoFields);
    });

    // Eventos de recorrência para cartão de crédito
    document.querySelectorAll('input[name="recorrencia_tipo_cartao"]').forEach(elem => {
        elem.addEventListener('change', toggleParcelamentoCartaoFields);
    });

    // Evento de mudança de categoria (receita/despesa)
    const categoriaSelect = document.getElementById('categoria');
    if (categoriaSelect) {
        categoriaSelect.addEventListener('change', carregarSubcategorias);
    }

    // Evento de mudança de categoria (cartão de crédito)
    const categoriaCartaoSelect = document.getElementById('categoria_cartao');
    if (categoriaCartaoSelect) {
        categoriaCartaoSelect.addEventListener('change', carregarSubcategoriasCartao);
    }

    // Configurar modais
    configurarModalExclusao();
    configurarModalTransferencia();

    // Inicializar estado do formulário
    toggleLancamentoFields();
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializarEventos);