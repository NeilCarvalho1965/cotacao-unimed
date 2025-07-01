let tabelaPrecos = [];
let ultimaMensagem = '';
let textoConsulta = '';
let textoExames = '';
let textoInternacao = '';

// Carrega e processa CSV
fetch('tabela_preco.csv')
  .then(response => response.text())
  .then(data => {
    tabelaPrecos = parseCSV(data);
    preencherTipoPlano();
  });

// CSV parsing
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

// Preenche select de Tipo de Plano
function preencherTipoPlano() {
  const tipos = [...new Set(tabelaPrecos.map(l => l.tipo_plano))];
  preencherSelect('tipoPlano', tipos);
  filtrarPlanos(); // inicializa plano
}

// Preenche select com valores únicos
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

// Filtra planos a partir do tipo
function filtrarPlanos() {
  const tipo = document.getElementById('tipoPlano').value;
  const planos = [...new Set(tabelaPrecos.filter(l => l.tipo_plano === tipo).map(l => l.plano))];
  preencherSelect('plano', planos);
  filtrarCoparticipacoes();
}

// Filtra coparticipações a partir do plano
function filtrarCoparticipacoes() {
  const tipo = document.getElementById('tipoPlano').value;
  const plano = document.getElementById('plano').value;
  const coparts = [...new Set(tabelaPrecos.filter(l =>
    l.tipo_plano === tipo && l.plano === plano).map(l => l.coparticipacao))];
  preencherSelect('coparticipacao', coparts);
}

// Adiciona um beneficiário
function adicionarBeneficiario() {
  const div = document.createElement('div');
  div.style.marginBottom = '10px';
  div.innerHTML = `
    <div style="display: flex; gap: 20px; align-items: flex-end;">
        <label style="flex: 1;">
            Idade:
            <input type="number" class="idade" style="width: 100%; background-color: #eefaf0; padding: 5px;">
        </label>
        <label style="flex: 1;">
            Data de Nascimento:
            <input type="date" class="nascimento" style="width: 100%;">
        </label>
        <label style="flex: 1;">
            Acomodação:
            <select class="acomodacao" style="width: 100%;">
                <option>Enfermaria</option>
                <option>Apartamento</option>
            </select>
        </label>
    </div>
  `;
  document.getElementById('beneficiarios').appendChild(div);
}

// Retorna idade a partir da data de nascimento
function calcularIdade(data) {
  const nasc = new Date(data);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

// Gera cotação e imagem
function gerarCotacao() {
  const tipoPlano = document.getElementById('tipoPlano').value;
  const plano = document.getElementById('plano').value;
  const copart = document.getElementById('coparticipacao').value;
  const abrangencia = obterAbrangencia(plano);

  // Info extra do plano
  const infoPlano = tabelaPrecos.find(l =>
    l.tipo_plano === tipoPlano &&
    l.plano === plano &&
    l.coparticipacao === copart
  );
  textoConsulta = infoPlano?.coparticipacao_consulta || '';
  textoExames = infoPlano?.coparticipacao_exames || '';
  textoInternacao = infoPlano?.internacao || '';

  // Coleta beneficiários
  const beneficiarios = Array.from(document.querySelectorAll('#beneficiarios > div')).map(div => {
    const idadeInput = div.querySelector('.idade');
    const nascimentoInput = div.querySelector('.nascimento');
    let idade = parseInt(idadeInput.value);
    if (!idade && nascimentoInput.value) idade = calcularIdade(nascimentoInput.value);
    return {
      idade: idade,
      acomodacao: div.querySelector('.acomodacao').value
    };
  }).filter(b => !isNaN(b.idade));

  // Ordena por idade
  beneficiarios.sort((a, b) => a.idade - b.idade);

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

// Verifica quantidade beneficiários
function verificaQuantidade(qtdTabela, qtdGrupo) {
  if (qtdTabela === '999') return true;
  if (qtdTabela.includes('+')) return qtdGrupo >= parseInt(qtdTabela);
  if (qtdTabela.includes('-')) {
    const [min, max] = qtdTabela.split('-').map(Number);
    return qtdGrupo >= min && qtdGrupo <= max;
  }
  return parseInt(qtdTabela) === qtdGrupo;
}

// Define abrangência por plano
function obterAbrangencia(plano) {
  const abrangencias = {
    "Flex 1": "Regional",
    "Amigo": "Nacional",
    "Flex Smart 1": "Regional",
    "Pleno": "Regional"
  };
  return abrangencias[plano] || "Indefinida";
}

// Desenha a imagem final
function desenharCotacao() {
  const canvas = document.getElementById('cotacaoImagem');
  const ctx = canvas.getContext('2d');
  const lines = ultimaMensagem.split('\n');

  const altura = 150 + lines.length * 25 + 180;
  canvas.width = 350;
  canvas.height = altura;

  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.src = 'unimed-logo.png';
  img.onload = () => {
    const logoWidth = 250, logoHeight = 80;
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

    // Informações extras
    ctx.fillStyle = '#007d3c';
    ctx.font = '12px Arial';
    ctx.fillText(`✅ Coparticipação na consulta: ${textoConsulta}`, 20, canvas.height - 150);
    ctx.fillText(`✅ Nos exames: ${textoExames}`, 20, canvas.height - 135);

    const partesInternacao = textoInternacao.split(' e ');
    if (partesInternacao.length > 1) {
      ctx.fillText(`✅ ${partesInternacao[0]} e`, 20, canvas.height - 120);
      ctx.fillText(partesInternacao[1], 20, canvas.height - 105);
    } else {
      ctx.fillText(`✅ ${textoInternacao}`, 20, canvas.height - 120);
    }

    // Aviso e rodapé
    ctx.font = '11px Arial';
    ctx.fillText('Esta cotação tem caráter estritamente informativo,', 20, canvas.height - 70);
    ctx.fillText('apresentando estimativa dos valores praticados.', 20, canvas.height - 55);

    ctx.fillStyle = '#007d3c';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Sandra Regina – (41) 99981-7997', 20, canvas.height - 20);

    const wppIcon = new Image();
    wppIcon.src = 'whatsapp-icon.png';
    wppIcon.onload = () => {
      ctx.drawImage(wppIcon, canvas.width - 40, canvas.height - 45, 30, 30);
      const imgElement = document.getElementById('cotacaoImagemFinal');
      imgElement.src = canvas.toDataURL('image/png');
      imgElement.style.display = 'block';
    };
  };
}
