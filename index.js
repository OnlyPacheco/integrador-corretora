// ============================================================
//  INTEGRADOR CHAVES NA MÃO  —  Feed XML automático (Node.js)
//  Hospede no Vercel
// ============================================================

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://koeybtgqlhbdljqtktnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZXlidGdxbGhiZGxqcXRrdG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNzIyODEsImV4cCI6MjA3MzY0ODI4MX0.UaiaGMSK4l_nHQjMYD6tNO3kERDVppurImDwAwDQeMQ';
const SITE_URL = 'https://corretora-goncalves.netlify.app';
const ESTADO_PADRAO = 'RJ';

// Busca apenas imóveis ativos no Supabase
async function buscarImoveis() {
    const url = `${SUPABASE_URL}/rest/v1/imoveis?select=*&status=eq.ativo`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

// Escapa XML (trata & corretamente)
function xmlEscape(str) {
    if (!str) return '';
    str = String(str);
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    str = str.replace(/&(?!(?:amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);)/g, '&amp;');
    return str.replace(/[<>]/g, function(m) {
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Gera tag XML
function tag(nome, valor = '') {
    if (!valor || valor === '') return `        <${nome}/>\n`;
    return `        <${nome}>${xmlEscape(valor)}</${nome}>\n`;
}

// Remove tudo que não é número
function soNumeros(str) {
    if (!str) return '';
    return String(str).replace(/\D/g, '');
}

// Formata data
function formatarData(data) {
    if (!data) return '';
    const ts = Date.parse(data);
    if (isNaN(ts)) return '';
    const d = new Date(ts);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Extrai fotos
function extrairFotos(row) {
    const raw = row.imagens;
    if (!raw) return [];
    let lista = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : null);
    if (!Array.isArray(lista)) return [];

    const fotos = [];
    for (const item of lista) {
        if (typeof item === 'object' && item.url) {
            fotos.push(item.url);
        } else if (typeof item === 'string' && item.startsWith('http')) {
            fotos.push(item);
        }
    }
    return fotos;
}

// Extrai lista
function extrairLista(row, campo) {
    const raw = row[campo];
    if (!raw) return [];
    let lista = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : null);
    if (!Array.isArray(lista)) {
        return String(raw).split(',').map(s => s.trim()).filter(Boolean);
    }
    return lista.filter(Boolean).map(String);
}

// Handler principal (para Vercel)
module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-cache');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Document>\n';
    xml += '    <imoveis>\n';

    const imoveis = await buscarImoveis();

    for (const row of imoveis) {
        const id = row.id || '';
        const titulo = row.name || '';
        const tipo = row.tipoimovel || 'Apartamento';

        const precoVenda = parseFloat(row.precovenda) || 0;

        // Todos os imóveis são de venda
        const trans1 = 'V';
        const trans2 = '';

        const condominio = soNumeros(row.condominio);
        const iptu = soNumeros(row.iptu);
        const area = row.areaimovel || '';
        const quartos = row.quartos || '';
        const banheiros = row.banheiros || '';
        const suites = row.suitesqtd || '';
        const garagem = row.garagemvagas || '';
        const rua = row.rua || '';
        const bairro = row.bairro || '';
        const cidade = row.cidade || '';
        const cep = soNumeros(row.cep);

        const petsRaw = String(row.aceitapets || '').toLowerCase().trim();
        const aceitaPet = (petsRaw === 'sim' || petsRaw === '1') ? '1' : '0';

        const descricao = row.info_adicional || '';
        const link = `${SITE_URL}/property.html?id=${encodeURIComponent(id)}`;
        const dataAtual = formatarData(row.created_at);

        const fotos = extrairFotos(row);
        const areaComum = extrairLista(row, 'arealazeritens');

        xml += '    <imovel>\n';
        xml += tag('referencia', id);
        xml += tag('codigo_cliente', id);
        xml += tag('link_cliente', link);
        xml += tag('titulo', titulo);
        xml += tag('transacao', trans1);
        xml += tag('transacao2', trans2);
        xml += tag('finalidade', 'RE');
        xml += tag('finalidade2', '');
        xml += tag('destaque', '0');
        xml += tag('tipo', tipo);
        xml += tag('tipo2', '');
        xml += tag('valor', precoVenda > 0 ? soNumeros(String(precoVenda)) : '');
        xml += tag('valor_locacao', '');
        xml += tag('valor_iptu', iptu);
        xml += tag('valor_condominio', condominio);
        xml += tag('area_total', area);
        xml += tag('area_util', area);
        xml += tag('conservacao', '');
        xml += tag('quartos', quartos);
        xml += tag('suites', suites);
        xml += tag('garagem', garagem);
        xml += tag('banheiro', banheiros);
        xml += tag('closet', '');
        xml += tag('salas', '');
        xml += tag('despensa', '');
        xml += tag('bar', '');
        xml += tag('cozinha', '1');
        xml += tag('quarto_empregada', '');
        xml += tag('escritorio', '');
        xml += tag('area_servico', '');
        xml += tag('lareira', '');
        xml += tag('varanda', '');
        xml += tag('lavanderia', '');
        xml += tag('aceita_pet', aceitaPet);
        xml += tag('estado', ESTADO_PADRAO);
        xml += tag('cidade', cidade);
        xml += tag('bairro', bairro);
        xml += tag('cep', cep);
        xml += tag('endereco', rua);
        xml += tag('numero', '');
        xml += tag('complemento', '');
        xml += tag('esconder_endereco_imovel', '0');
        xml += `        <descritivo><![CDATA[${descricao}]]></descritivo>\n`;

        xml += '        <fotos_imovel>\n';
        for (const urlFoto of fotos) {
            xml += '            <foto>\n';
            xml += `                <url>${xmlEscape(urlFoto)}</url>\n`;
            xml += `                <data_atualizacao>${xmlEscape(dataAtual)}</data_atualizacao>\n`;
            xml += '            </foto>\n';
        }
        xml += '        </fotos_imovel>\n';

        xml += tag('data_atualizacao', dataAtual);
        xml += tag('latitude', row.latitude || '');
        xml += tag('longitude', row.longitude || '');
        xml += tag('video', '');
        xml += tag('tour_360', '');

        xml += '        <area_comum>\n';
        for (const item of areaComum) {
            xml += `            <item>${xmlEscape(item)}</item>\n`;
        }
        xml += '        </area_comum>\n';

        xml += '        <area_privativa/>\n';
        xml += tag('aceita_troca', '');
        xml += tag('periodo_locacao', '');
        xml += '    </imovel>\n';
    }

    xml += '    </imoveis>\n';
    xml += '</Document>';

    res.status(200).send(xml);
};