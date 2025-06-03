
let tabelaPrecos = [];

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
        return cabecalho.reduce((obj, key, idx) => {
            obj[key.trim()] = valores[idx].trim();
            return obj;
        }, {});
    });
}

function preencherSelects() {
    preencherSelect('tipoPlano', [...new Set(tabelaPrecos.map(l => l.tipo_plano))]);
    preencherSelect('plano', [...new Set(tabelaPrecos.map(l => l.plano))]);
    preencherSelect('coparticipacao', [...new Set(tabelaPrecos.map(l => l.coparticipacao))]);
    preencherSelect('abrangencia', [...new Set(tabelaPrecos.map(l => l.abrangencia))]);
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

function gerarCotacao() {
    const tipoPlano = document.getElementById('tipoPlano').value;
    const plano = document.getElementById('plano').value;
    const copart = document.getElementById('coparticipacao').value;
    const abrangencia = document.getElementById('abrangencia').value;

    const beneficiarios = Array.from(document.querySelectorAll('#beneficiarios > div')).map(div => {
        return {
            idade: parseInt(div.querySelector('.idade').value),
            acomodacao: div.querySelector('.acomodacao').value
        };
    });

    let mensagem = `Plano: ${tipoPlano} - ${plano}\nCoparticipação: ${copart}\nAbrangência: ${abrangencia}\n\nBeneficiários:\n`;
    let total = 0;
    let erro = false;

    beneficiarios.forEach(b => {
        const faixa = tabelaPrecos.find(l =>
            l.tipo_plano === tipoPlano &&
            l.plano === plano &&
            l.coparticipacao === copart &&
            l.abrangencia === abrangencia &&
            l.acomodacao === b.acomodacao &&
            b.idade >= parseInt(l.faixa_min) &&
            b.idade <= parseInt(l.faixa_max)
        );

        if (!faixa) {
            alert(`Não há valor cadastrado para ${b.acomodacao}, ${b.idade} anos.`);
            erro = true;
            return;
        }

        const valor = parseFloat(faixa.valor.replace(',', '.'));
        total += valor;
        mensagem += `- ${b.idade} anos | ${b.acomodacao} | R$ ${valor.toFixed(2).replace('.', ',')}\n`;
    });

    if (erro) return;

    mensagem += `\nValor Total: R$ ${total.toFixed(2).replace('.', ',')}\nSandra Regina – (41) 99981-7997`;

    gerarImagem(mensagem);
}

function gerarImagem(texto) {
    const canvas = document.getElementById('cotacaoImagem');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 400;

    const img = new Image();
    img.src = 'unimed-logo.png';
    img.onload = function () {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, (canvas.width - img.width) / 2, 10);

        ctx.fillStyle = '#007d3c';
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Sandra Regina – (41) 99981-7997', 10, canvas.height - 20);

        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        const lines = texto.split('\n');
        lines.forEach((line, idx) => {
            ctx.fillText(line, 10, 120 + idx * 20);
        });

        document.getElementById('copiarImagem').style.display = 'inline';
    };
}

document.getElementById('copiarImagem').addEventListener('click', function() {
    const canvas = document.getElementById('cotacaoImagem');
    canvas.toBlob(blob => {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]);
        alert('Imagem copiada!');
    });
});
