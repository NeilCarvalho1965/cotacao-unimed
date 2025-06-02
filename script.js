
function adicionarBeneficiario() {
    const div = document.createElement('div');
    div.innerHTML = '<label>Idade: <input type="number" class="idade"></label>' +
                    '<label>Acomodação: <select class="acomodacao"><option>Enfermaria</option><option>Apartamento</option></select></label>';
    document.getElementById('beneficiarios').appendChild(div);
}

function gerarCotacao() {
    const canvas = document.getElementById('cotacaoImagem');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 400;
    
    ctx.fillStyle = '#007d3c';
    ctx.fillRect(0, 0, canvas.width, 50);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Sandra Regina – (41) 99981-7997', 10, 30);
    
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText('Cotação gerada com sucesso!', 10, 80);

    document.getElementById('copiarImagem').style.display = 'inline';
}

document.getElementById('copiarImagem').addEventListener('click', function() {
    const canvas = document.getElementById('cotacaoImagem');
    canvas.toBlob(function(blob) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]);
        alert('Imagem copiada!');
    });
});
