let tabelaPrecos = [];
let ultimaMensagem = '';
let textoConsulta = '';
let textoExames = '';
let textoInternacao = '';

fetch('tabela_precos.csv')
    .then(response => response.text())
    .then(data => {
        tabelaPrecos = parseCSV(data);
        preencherSelects();
    });

function parseCSV(data) {
    const linhas = data.trim().split('\n');
    const cabecalho = linhas.shift().split(';');
    return linhas.map(l => {
        const valores = l.split(';');
        if (valores.length < cabecalho.length) return null;
        return cabecalho.reduce((obj, key, idx) => {
            obj[key.trim()] = valores[idx].trim();
            return obj;
        }, {});
    }).filter(Boolean);
}

function preencherSelects() {
    preencherSelect('tipoPlano', [...new Set(tabelaPrecos.map(l => l.tipo_plano))]);
    preencherSelect('plano', [...new Set(tabelaPrecos.map(l => l.plano))]);
    preencherSelect('coparticipacao', [...new Set(tabelaPrecos.map(l => l.coparticipacao))]);
}

function preencherSelect(id, valores) {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    valores.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
    });
}

function adicionarBeneficiario() {
    const div = document.createElement('div');
    div.innerHTML = `
        <label>Idade: <input type="number" class="idade"></label>
        <label>Acomodação:
            <select class="acomodacao">
                <option>Enfermaria</option>
                <option>Apartamento</option>
            </select>
        </label>
    `;
    document.getElementById('beneficiarios').appendChild(div);
}

function obterAbrangencia(plano) {
    const abrangencias = {
        "Flex": "Regional",
        "Amigo": "Nacional",
        "Smart": "Regional",
        "Simepar": "Regional"
    };
    return abrangencias[plano] || "Indefinida";
}

function gerarCotacao() {
    const tipoPlano = document.getElementById('tipoPlano').value;
    const plano = document.getElementById('plano').value;
    const copart = document.getElementById('coparticipacao').value;
    const abrangencia = obterAbrangencia(plano);

    // Buscar informações adicionais do plano
    const infoPlano = tabelaPrecos.find(l =>
        l.tipo_plano === tipoPlano &&
        l.plano === plano &&
        l.coparticipacao === copart
    );

    textoConsulta = infoPlano ? infoPlano.coparticipacao_consulta : '';
    textoExames = infoPlano ? infoPlano.coparticipacao_exames : '';
    textoInternacao = infoPlano ? infoPlano.internacao : '';

    const beneficiarios = Array.from(document.querySelectorAll('#beneficiarios > div')).map(div => {
        return {
            idade: parseInt(div.querySelector('.idade').value),
            acomodacao: div.querySelector('.acomodacao').value
        };
    });

    const qtdBeneficiarios = beneficiarios.length;

    let mensagem = `\n\nTipo: ${tipoPlano}\nPlano: ${plano}\nAbrangência: ${abrangencia}\nCoparticipação: ${copart}\n\nBeneficiários:\n`;
    let total = 0;
    let erro = false;

    beneficiarios.forEach(b => {
        let faixa = tabelaPrecos.find(l =>
            l.tipo_plano === tipoPlano &&
            l.plano === plano &&
            l.coparticipacao === copart &&
            l.acomodacao === b.acomodacao &&
            b.idade >= parseInt(l.faixa_min) &&
            b.idade <= parseInt(l.faixa_max) &&
            verificaQuantidade(l.qtd_beneficiarios, qtdBeneficiarios)
        );

        if (!faixa || !faixa.valor) {
            alert(`Não há valor cadastrado para ${b.acomodacao}, ${b.idade} anos.`);
            erro = true;
            return;
        }

        const valor = parseFloat(faixa.valor.replace(',', '.'));
        if (isNaN(valor)) {
            alert(`Valor inválido na tabela para ${b.acomodacao}, ${b.idade} anos.`);
            erro = true;
            return;
        }

        total += valor;
        mensagem += `- ${b.idade} anos | ${b.acomodacao} | R$ ${valor.toFixed(2).replace('.', ',')}\n`;
    });

    if (erro) return;

    mensagem += `\nValor Total: R$ ${total.toFixed(2).replace('.', ',')}`;

    ultimaMensagem = mensagem;

    desenharCotacao();
}

function desenharCotacao() {
    const canvas = document.getElementById('cotacaoImagem');
    const ctx = canvas.getContext('2d');

    const lines = ultimaMensagem.split('\n');
    const baseAltura = 150 + lines.length * 25 + 150;  // Ajuste de altura
    canvas.width = 350;
    canvas.height = baseAltura;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = 'unimed-logo.png';
    img.onload = function () {
        const logoWidth = 250;
        const logoHeight = 80;
        ctx.drawImage(img, (canvas.width - logoWidth) / 2, 10, logoWidth, logoHeight);

        let y = 10 + logoHeight + 30;

        ctx.fillStyle = '#007d3c';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Proposta de Plano de Saúde', canvas.width / 2, y);

        y += 20;

        ctx.textAlign = 'left';
        lines.forEach((line, idx) => {
            ctx.font = line.startsWith('Valor Total:') ? 'bold 16px Arial' : '16px Arial';
            ctx.fillText(line, 20, y + idx * 25);
        });

        // Calcula nova baseY após os beneficiários
        let yInformacoes = y + lines.length * 25 + 20;

        // Informações adicionais
        ctx.fillStyle = '#007d3c';
        ctx.font = '12px Arial';
        ctx.fillText(`✅ Coparticipação na consulta: ${textoConsulta}`, 20, yInformacoes);
        yInformacoes += 15;

        ctx.fillText(`✅ Nos exames: ${textoExames}`, 20, yInformacoes);
        yInformacoes += 15;

        // Quebra automática para internacao
        const partesInternacao = textoInternacao.split(' e ');
        if (partesInternacao.length > 1) {
            ctx.fillText(`✅ ${partesInternacao[0]} e`, 20, yInformacoes);
            yInformacoes += 15;
            ctx.fillText(partesInternacao[1], 20, yInformacoes);
            yInformacoes += 15;
        } else {
            ctx.fillText(`✅ ${textoInternacao}`, 20, yInformacoes);
            yInformacoes += 15;
        }
        
        // Frase informativa
        ctx.font = '11px Arial';
        ctx.fillText('Esta cotação tem caráter estritamente informativo,', 20, yInformacoes);
        yInformacoes += 15;
        ctx.fillText('apresentando estimativa dos valores praticados.', 20, yInformacoes);
        yInformacoes += 20;

        // Ajusta altura final do canvas
        canvas.height = yInformacoes + 50;

        // Redesenha fundo da tarja
        ctx.fillStyle = '#007d3c';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Sandra Regina – (41) 99981-7997', 20, canvas.height - 20);

        const wppIcon = new Image();
        wppIcon.src = 'whatsapp-icon.png';
        wppIcon.onload = function () {
            ctx.drawImage(wppIcon, canvas.width - 40, canvas.height - 45, 30, 30);
        };
    };
}

function verificaQuantidade(qtdTabela, qtdGrupo) {
    if (qtdTabela === '999') return true;

    if (qtdTabela.includes('+')) {
        const base = parseInt(qtdTabela);
        return qtdGrupo >= base;
    }

    if (qtdTabela.includes('-')) {
        const [min, max] = qtdTabela.split('-').map(Number);
        return qtdGrupo >= min && qtdGrupo <= max;
    }

    return parseInt(qtdTabela) === qtdGrupo;
}
