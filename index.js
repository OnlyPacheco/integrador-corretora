const fetch = require('node-fetch');

const SUPABASE_URL = 'https://koeybtgqlhbdljqtktnw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZXlidGdxbGhiZGxqcXRrdG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNzIyODEsImV4cCI6MjA3MzY0ODI4MX0.UaiaGMSK4l_nHQjMYD6tNO3kERDVppurImDwAwDQeMQ';
const SITE_URL = 'https://corretora-goncalves.netlify.app';
const ESTADO_PADRAO = 'RJ';

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

function xmlEscape(str) {
    if (!str) return '';
    return String(str)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function tag(nome, valor = '') {
    const v = valor === null ? '' : String(valor);
    if (v === '') return `            <${nome}></${nome}>\n`;
    return `            <${nome}>${xmlEscape(v)}</${nome}>\n`;
}

function soNumeros(str) {
    if (!str) return '';
    return String(str).replace(/\D/g, '');
}

function formatarData(data) {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace('T', ' ').split('.')[0];
}

module.exports = async function handler(req, res) {
    res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-cache');
    
    const imoveis = await buscarImoveis();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Document>\n';
    xml += '    <imoveis>\n';
    
    for (const row of imoveis) {
        const id = row.id || '';
        const precoVenda = parseFloat(row.precovenda) || 0;
        const precoAluguel = parseFloat(row.precoaluguel) || 0;
        const dataAtual = formatarData(row.created_at);

        xml += '        <imovel>\n';
        xml += tag('referencia', id);
        xml += tag('codigo_cliente', id);
        xml += tag('link_cliente', `${SITE_URL}/property.html?id=${id}`);
        xml += tag('titulo', row.name || '');
        xml += tag('transacao', precoVenda > 0 ? 'V' : '');
        xml += tag('transacao2', precoAluguel > 0 ? 'L' : '');
        xml += tag('finalidade', 'RE');
        xml += tag('finalidade2', '');
        xml += tag('destaque', '0');
        xml += tag('tipo', row.tipoimovel || 'Apartamento');
        xml += tag('tipo2', '');
        xml += tag('valor', precoVenda > 0 ? soNumeros(precoVenda) : '');
        xml += tag('valor_locacao', precoAluguel > 0 ? soNumeros(precoAluguel) : '');
        xml += tag('valor_iptu', soNumeros(row.iptu));
        xml += tag('valor_condominio', soNumeros(row.condominio));
        xml += tag('area_total', row.areaimovel || '');
        xml += tag('area_util', row.areaimovel || '');
        xml += tag('conservacao', '');
        xml += tag('quartos', row.quartos || '');
        xml += tag('suites', row.suitesqtd || '');
        xml += tag('garagem', row.garagemvagas || '');
        xml += tag('banheiro', row.banheiros || '');
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
        xml += tag('aceita_pet', (String(row.aceitapets).toLowerCase() === 'sim' || row.aceitapets == '1') ? '1' : '0');
        xml += tag('estado', ESTADO_PADRAO);
        xml += tag('cidade', row.cidade || '');
        xml += tag('bairro', row.bairro || '');
        xml += tag('cep', soNumeros(row.cep));
        xml += tag('endereco', row.rua || '');
        xml += tag('numero', '');
        xml += tag('complemento', '');
        xml += tag('esconder_endereco_imovel', '0');
        
        // Descritivo com CDATA para evitar erro de caracteres especiais
        xml += `            <descritivo><![CDATA[${row.info_adicional || ''}]]></descritivo>\n`;
        
        xml += '            <fotos_imovel>\n';
        const rawImgs = row.imagens;
        const fotos = Array.isArray(rawImgs) ? rawImgs : JSON.parse(rawImgs || '[]');
        for (const f of fotos) {
            const url = typeof f === 'object' ? f.url : f;
            xml += '                <foto>\n';
            xml += `                    <url>${xmlEscape(url)}</url>\n`;
            xml += `                    <data_atualizacao>${dataAtual}</data_atualizacao>\n`;
            xml += '                </foto>\n';
        }
        xml += '            </fotos_imovel>\n';
        
        xml += tag('data_atualizacao', dataAtual);
        xml += tag('latitude', row.latitude || '');
        xml += tag('longitude', row.longitude || '');
        xml += tag('video', '');
        xml += tag('tour_360', '');
        
        xml += '            <area_comum>\n';
        const lazer = Array.isArray(row.arealazeritens) ? row.arealazeritens : JSON.parse(row.arealazeritens || '[]');
        for (const item of lazer) {
            xml += `                <item>${xmlEscape(item)}</item>\n`;
        }
        xml += '            </area_comum>\n';
        
        xml += '            <area_privativa/>\n';
        xml += tag('aceita_troca', '');
        xml += tag('periodo_locacao', '');
        xml += '        </imovel>\n';
    }
    
    xml += '    </imoveis>\n';
    xml += '</Document>';
    
    res.status(200).send(xml);
};
