# app_routes/cartoes_routes.py

import os
from flask import Blueprint, render_template, request, redirect, url_for, flash
from sqlalchemy.exc import IntegrityError
from sqlalchemy import extract
from werkzeug.utils import secure_filename
from datetime import datetime

# Importa o 'db' e os modelos do arquivo principal da aplicação
from app import db, app
from models import CartaoCredito, Conta, Categoria, Lancamento, Recorrencia, FaturaCartao

# Cria o Blueprint
cartoes_bp = Blueprint(
    'cartoes_bp', __name__,
    template_folder='../templates',
    static_folder='../static'
)

# =============================================================================
# ROTAS PRINCIPAIS - GERENCIAR CARTÕES
# =============================================================================

@cartoes_bp.route('/cartoes', methods=['GET', 'POST'])
def gerenciar_cartoes():
    """Página principal para gerenciar cartões de crédito"""
    if request.method == 'POST':
        nome = request.form['nome']
        dia_vencimento = int(request.form['dia_vencimento'])
        conta_pagamento_id = request.form.get('conta_pagamento_id')
        
        # Validação do dia de vencimento
        if dia_vencimento < 1 or dia_vencimento > 31:
            flash('O dia de vencimento deve estar entre 1 e 31.', 'danger')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        
        # Converter conta_pagamento_id para None se estiver vazio
        if conta_pagamento_id == '':
            conta_pagamento_id = None
        
        # Processar upload de logo
        logo_filename = None
        if 'logo_imagem' in request.files:
            logo_file = request.files['logo_imagem']
            if logo_file.filename != '':
                logo_filename = secure_filename(logo_file.filename)
                logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
        
        # Criar novo cartão
        novo_cartao = CartaoCredito(
            nome=nome, 
            dia_vencimento=dia_vencimento,
            conta_pagamento_id=conta_pagamento_id,
            logo_imagem=logo_filename
        )
        
        try:
            db.session.add(novo_cartao)
            db.session.commit()
            flash('Cartão de crédito adicionado com sucesso!', 'success')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        except IntegrityError:
            db.session.rollback()
            flash('Já existe um cartão com este nome. Por favor, escolha outro.', 'danger')
    
    # Buscar dados para renderizar a página
    cartoes = CartaoCredito.query.filter_by(ativo=True).order_by(CartaoCredito.nome).all()
    contas = Conta.query.order_by(Conta.nome).all()
    
    return render_template('cartoes.html', cartoes=cartoes, contas=contas)

@cartoes_bp.route('/cartoes/editar/<int:id>', methods=['GET', 'POST'])
def editar_cartao(id):
    """Editar um cartão de crédito existente"""
    cartao = CartaoCredito.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            cartao.nome = request.form['nome']
            cartao.dia_vencimento = int(request.form['dia_vencimento'])
            
            # Atualizar conta de pagamento
            conta_pagamento_id = request.form.get('conta_pagamento_id')
            if conta_pagamento_id == '':
                cartao.conta_pagamento_id = None
            else:
                cartao.conta_pagamento_id = conta_pagamento_id
            
            # Validação do dia de vencimento
            if cartao.dia_vencimento < 1 or cartao.dia_vencimento > 31:
                flash('O dia de vencimento deve estar entre 1 e 31.', 'danger')
                contas = Conta.query.order_by(Conta.nome).all()
                return render_template('editar_cartao.html', cartao=cartao, contas=contas)
            
            # Processar nova logo se enviada
            if 'logo_imagem' in request.files:
                logo_file = request.files['logo_imagem']
                if logo_file.filename != '':
                    # Remove logo antigo se existir
                    if cartao.logo_imagem:
                        old_logo_path = os.path.join(app.config['UPLOAD_FOLDER'], cartao.logo_imagem)
                        if os.path.exists(old_logo_path):
                            os.remove(old_logo_path)
                    
                    logo_filename = secure_filename(logo_file.filename)
                    logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
                    cartao.logo_imagem = logo_filename
            
            db.session.commit()
            flash('Cartão de crédito atualizado com sucesso!', 'success')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        except IntegrityError:
            db.session.rollback()
            flash('Já existe um cartão com este nome. Por favor, escolha outro.', 'danger')
            contas = Conta.query.order_by(Conta.nome).all()
            return render_template('editar_cartao.html', cartao=cartao, contas=contas)
    
    contas = Conta.query.order_by(Conta.nome).all()
    return render_template('editar_cartao.html', cartao=cartao, contas=contas)

@cartoes_bp.route('/cartoes/inativar/<int:id>', methods=['POST'])
def inativar_cartao(id):
    """Inativar um cartão de crédito"""
    cartao = CartaoCredito.query.get_or_404(id)
    cartao.ativo = False
    db.session.commit()
    flash(f'Cartão "{cartao.nome}" foi inativado com sucesso.', 'info')
    return redirect(url_for('cartoes_bp.gerenciar_cartoes'))

# =============================================================================
# ROTAS DO EXTRATO - VISUALIZAÇÃO E FILTROS
# =============================================================================

@cartoes_bp.route('/cartoes/extrato')
def extrato_cartao():
    """Página de extrato detalhado do cartão de crédito"""
    # Obter parâmetros da URL
    cartao_id = request.args.get('cartao_id', type=int)
    ano = request.args.get('ano', datetime.now().year, type=int)
    mes = request.args.get('mes', datetime.now().month, type=int)
    
    # Buscar cartões ativos para o seletor
    cartoes = CartaoCredito.query.filter_by(ativo=True).order_by(CartaoCredito.nome).all()
    
    # Inicializar variáveis
    lancamentos = []
    cartao_selecionado = None
    total_mes = 0.0
    
    # Se há cartão selecionado, buscar os lançamentos
    if cartao_id:
        cartao_selecionado = CartaoCredito.query.get_or_404(cartao_id)
        
        # Buscar lançamentos do cartão no mês/ano selecionado (excluir faturas)
        lancamentos = Lancamento.query.filter(
            Lancamento.cartao_credito_id == cartao_id,
            extract('year', Lancamento.data_vencimento) == ano,
            extract('month', Lancamento.data_vencimento) == mes,
            ~Lancamento.descricao.like('Fatura %')  # Excluir faturas
        ).order_by(Lancamento.data_vencimento, Lancamento.id).all()
        
        # Calcular total do mês
        total_mes = sum(l.valor for l in lancamentos)
    
    # Opções para os seletores
    anos_disponiveis = range(datetime.now().year - 2, datetime.now().year + 2)
    meses_disponiveis = [
        {'id': 1, 'nome': 'Janeiro'}, {'id': 2, 'nome': 'Fevereiro'}, {'id': 3, 'nome': 'Março'},
        {'id': 4, 'nome': 'Abril'}, {'id': 5, 'nome': 'Maio'}, {'id': 6, 'nome': 'Junho'},
        {'id': 7, 'nome': 'Julho'}, {'id': 8, 'nome': 'Agosto'}, {'id': 9, 'nome': 'Setembro'},
        {'id': 10, 'nome': 'Outubro'}, {'id': 11, 'nome': 'Novembro'}, {'id': 12, 'nome': 'Dezembro'}
    ]
    
    return render_template(
        'extrato_cartao.html',
        cartoes=cartoes,
        cartao_selecionado=cartao_selecionado,
        lancamentos=lancamentos,
        total_mes=total_mes,
        cartao_id=cartao_id,
        ano=ano,
        mes=mes,
        anos_disponiveis=anos_disponiveis,
        meses_disponiveis=meses_disponiveis,
        categorias=Categoria.query.order_by(Categoria.nome).all()
    )

# =============================================================================
# ROTAS DE EDIÇÃO - LANÇAMENTOS DO EXTRATO
# =============================================================================

@cartoes_bp.route('/cartoes/editar_lancamento', methods=['POST'])
def editar_lancamento_cartao():
    """Editar lançamentos do cartão a partir do extrato"""
    tipo_edicao = request.form.get('tipo_edicao')
    lancamento_id = request.form.get('lancamento_id')
    
    if tipo_edicao == 'unico':
        # =============================================================
        # EDITAR LANÇAMENTO ÚNICO
        # =============================================================
        lancamento = Lancamento.query.get_or_404(lancamento_id)
        
        # Atualizar dados do lançamento
        lancamento.descricao = request.form['descricao']
        lancamento.valor = float(request.form['valor'])
        lancamento.data_vencimento = datetime.strptime(request.form['data_vencimento'], '%Y-%m-%d').date()
        lancamento.subcategoria_id = request.form['subcategoria_id']
        lancamento.cartao_credito_id = request.form['cartao_id']
        
        db.session.commit()
        flash('Lançamento atualizado com sucesso!', 'success')
        
        # Retornar para o extrato do mesmo cartão/mês
        ano = lancamento.data_vencimento.year
        mes = lancamento.data_vencimento.month
        return redirect(url_for('cartoes_bp.extrato_cartao', cartao_id=lancamento.cartao_credito_id, ano=ano, mes=mes))
    
    elif tipo_edicao in ['apenas_mes', 'futuros']:
        # =============================================================
        # EDITAR RECORRÊNCIA
        # =============================================================
        lancamento_base = Lancamento.query.get_or_404(lancamento_id)
        recorrencia_id = request.form.get('recorrencia_id')
        
        # Dados da edição
        nova_descricao = request.form['descricao']
        novo_valor = float(request.form['valor'])
        nova_subcategoria_id = request.form['subcategoria_id']
        novo_cartao_id = request.form['cartao_id']
        data_inicio = datetime.strptime(request.form['data_inicio'], '%Y-%m-%d').date()
        
        if tipo_edicao == 'apenas_mes':
            # Editar apenas o lançamento atual
            lancamento_base.descricao = nova_descricao
            lancamento_base.valor = novo_valor
            lancamento_base.subcategoria_id = nova_subcategoria_id
            lancamento_base.cartao_credito_id = novo_cartao_id
            flash('Lançamento do mês atualizado com sucesso!', 'success')
        
        elif tipo_edicao == 'futuros':
            # Editar este e futuros lançamentos
            recorrencia = Recorrencia.query.get_or_404(recorrencia_id)
            recorrencia.descricao_base = nova_descricao
            
            # Buscar lançamentos a partir da data
            lancamentos_para_alterar = Lancamento.query.filter(
                Lancamento.recorrencia_id == recorrencia_id,
                Lancamento.data_vencimento >= data_inicio
            ).all()
            
            # Atualizar cada lançamento
            for lancamento in lancamentos_para_alterar:
                lancamento.valor = novo_valor
                lancamento.subcategoria_id = nova_subcategoria_id
                lancamento.cartao_credito_id = novo_cartao_id
                
                # Atualizar descrição considerando se é parcelada
                if recorrencia.tipo == 'Parcelada':
                    # Limpar descrição atual e recriar corretamente
                    descricao_base = nova_descricao
                    # Encontrar o número da parcela atual na sequência
                    parcelas_ordenadas = sorted([l for l in recorrencia.lancamentos], key=lambda x: x.data_vencimento)
                    indice_parcela = parcelas_ordenadas.index(lancamento) + 1
                    lancamento.descricao = f"{descricao_base} ({indice_parcela}/{recorrencia.total_parcelas})"
                else:
                    lancamento.descricao = nova_descricao
            
            flash('Recorrência atualizada a partir desta data!', 'success')
        
        db.session.commit()
        
        # Retornar para o extrato do mesmo cartão/mês
        ano = lancamento_base.data_vencimento.year
        mes = lancamento_base.data_vencimento.month
        return redirect(url_for('cartoes_bp.extrato_cartao', cartao_id=lancamento_base.cartao_credito_id, ano=ano, mes=mes))

# =============================================================================
# ROTAS DE EXCLUSÃO - LANÇAMENTOS DO EXTRATO
# =============================================================================

@cartoes_bp.route('/cartoes/excluir_lancamento', methods=['POST'])
def excluir_lancamento_cartao():
    """Excluir lançamentos do cartão a partir do extrato"""
    tipo_exclusao = request.form.get('tipo_exclusao')
    lancamento_id = request.form.get('lancamento_id')
    lancamento = Lancamento.query.get_or_404(lancamento_id)
    
    # Capturar dados para redirecionamento
    cartao_id = lancamento.cartao_credito_id
    ano = lancamento.data_vencimento.year
    mes = lancamento.data_vencimento.month
    
    if tipo_exclusao == 'unico':
        # =============================================================
        # EXCLUIR LANÇAMENTO ÚNICO
        # =============================================================
        db.session.delete(lancamento)
        flash('Lançamento excluído com sucesso!', 'info')
    
    elif tipo_exclusao == 'apenas_mes':
        # =============================================================
        # EXCLUIR APENAS ESTE MÊS DA RECORRÊNCIA
        # =============================================================
        db.session.delete(lancamento)
        flash('Lançamento do mês excluído com sucesso!', 'info')
    
    elif tipo_exclusao == 'futuros':
        # =============================================================
        # EXCLUIR ESTE E FUTUROS LANÇAMENTOS DA RECORRÊNCIA
        # =============================================================
        recorrencia_id = request.form.get('recorrencia_id')
        data_base = lancamento.data_vencimento
        
        # Buscar lançamentos a partir desta data
        lancamentos_a_deletar = Lancamento.query.filter(
            Lancamento.recorrencia_id == recorrencia_id,
            Lancamento.data_vencimento >= data_base
        ).all()
        
        # Deletar os lançamentos
        for lanc in lancamentos_a_deletar:
            db.session.delete(lanc)
        
        # Se não sobraram lançamentos, deletar a recorrência também
        recorrencia_restante = Lancamento.query.filter_by(recorrencia_id=recorrencia_id).first()
        if not recorrencia_restante:
            recorrencia_pai = Recorrencia.query.get(recorrencia_id)
            if recorrencia_pai:
                db.session.delete(recorrencia_pai)
        
        flash('Lançamentos futuros da recorrência foram excluídos!', 'info')
    
    db.session.commit()
    return redirect(url_for('cartoes_bp.extrato_cartao', cartao_id=cartao_id, ano=ano, mes=mes))

@cartoes_bp.route('/cartoes/marcar_fatura_mes_paga/<int:cartao_id>/<int:ano>/<int:mes>', methods=['POST'])
def marcar_fatura_mes_paga(cartao_id, ano, mes):
    """Marcar/desmarcar fatura de um mês específico como paga"""
    from models import FaturaCartao
    
    cartao = CartaoCredito.query.get_or_404(cartao_id)
    
    # Buscar se já existe registro da fatura
    fatura = FaturaCartao.query.filter_by(
        cartao_id=cartao_id,
        ano=ano,
        mes=mes
    ).first()
    
    if fatura:
        # Se existe, alternar status
        fatura.paga = not fatura.paga
        if fatura.paga:
            fatura.data_pagamento = datetime.now().date()
            flash(f'Fatura de {meses_nomes[mes-1]}/{ano} do {cartao.nome} marcada como PAGA!', 'success')
        else:
            fatura.data_pagamento = None
            flash(f'Fatura de {meses_nomes[mes-1]}/{ano} do {cartao.nome} marcada como PENDENTE.', 'warning')
    else:
        # Se não existe, criar como paga
        fatura = FaturaCartao(
            cartao_id=cartao_id,
            ano=ano,
            mes=mes,
            paga=True,
            data_pagamento=datetime.now().date()
        )
        db.session.add(fatura)
        flash(f'Fatura de {meses_nomes[mes-1]}/{ano} do {cartao.nome} marcada como PAGA!', 'success')
    
    db.session.commit()
    return redirect(url_for('cartoes_bp.extrato_cartao', cartao_id=cartao_id, ano=ano, mes=mes))

# Lista dos nomes dos meses para mensagens
meses_nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]