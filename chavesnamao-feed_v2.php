<?php
/**
 * ============================================================
 *  INTEGRADOR CHAVES NA MÃO  —  Feed XML automático
 *  Hospede este arquivo no InfinityFree (pasta htdocs)
 *  Acesse: http://corretora-goncalves-integrador.wuaze.com/chavesnamao-feed.php
 *  Cadastre essa URL no painel do Chaves na Mão como Feed XML.
 * ============================================================
 */

define('SUPABASE_URL',      'https://koeybtgqlhbdljqtktnw.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvZXlidGdxbGhiZGxqcXRrdG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNzIyODEsImV4cCI6MjA3MzY0ODI4MX0.UaiaGMSK4l_nHQjMYD6tNO3kERDVppurImDwAwDQeMQ');
define('SITE_URL',          'https://corretora-goncalves.netlify.app');
define('ESTADO_PADRAO',     'RJ');

function buscar_imoveis(): array {
    $url = SUPABASE_URL . '/rest/v1/imoveis?select=*&status=eq.ativo';
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'apikey: '           . SUPABASE_ANON_KEY,
            'Authorization: Bearer ' . SUPABASE_ANON_KEY,
            'Content-Type: application/json',
        ],
    ]);
    $json  = curl_exec($ch);
    $errno = curl_errno($ch);
    curl_close($ch);
    if ($errno || !$json) return [];
    $rows = json_decode($json, true);
    return is_array($rows) ? $rows : [];
}

// Escapa para XML e remove caracteres de controle inválidos
function x(string $v): string {
    // Remove caracteres de controle que XML não aceita (exceto tab=0x09, LF=0x0A, CR=0x0D)
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return htmlspecialchars($v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function tag(string $nome, string $valor = ''): string {
    if ($valor === '') return "        <{$nome}/>\n";
    return "        <{$nome}>" . x($valor) . "</{$nome}>\n";
}

function sonum(string $v): string {
    return preg_replace('/\D/', '', $v);
}

function fmt_data(string $v): string {
    if (!$v) return '';
    $ts = strtotime($v);
    return $ts ? date('Y-m-d H:i:s', $ts) : '';
}

function extrair_fotos(array $row): array {
    $raw = $row['imagens'] ?? null;
    if (!$raw) return [];
    $lista = is_array($raw) ? $raw : json_decode($raw, true);
    if (!is_array($lista)) return [];
    $fotos = [];
    foreach ($lista as $item) {
        if (is_array($item) && !empty($item['url']))
            $fotos[] = $item['url'];
        elseif (is_string($item) && str_starts_with($item, 'http'))
            $fotos[] = $item;
    }
    return $fotos;
}

function extrair_lista(array $row, string $campo): array {
    $raw = $row[$campo] ?? null;
    if (!$raw) return [];
    $lista = is_array($raw) ? $raw : json_decode($raw, true);
    if (!is_array($lista)) return array_filter(array_map('trim', explode(',', $raw)));
    return array_filter(array_map('strval', $lista));
}

$imoveis = buscar_imoveis();

header('Content-Type: application/xml; charset=UTF-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<Document>' . "\n";
echo '    <imoveis>' . "\n";

foreach ($imoveis as $row) {

    $id         = (string)($row['id']         ?? '');
    $titulo     = (string)($row['name']        ?? '');
    $tipo       = (string)($row['tipoimovel']  ?? 'Apartamento');

    $preco_venda   = (float)($row['precovenda']   ?? 0);
    $preco_aluguel = (float)($row['precoaluguel'] ?? 0);
    if ($preco_venda > 0 && $preco_aluguel > 0) { $trans1 = 'V'; $trans2 = 'L'; }
    elseif ($preco_aluguel > 0)                  { $trans1 = '';  $trans2 = 'L'; }
    else                                          { $trans1 = 'V'; $trans2 = ''; }

    $condominio = sonum((string)($row['condominio'] ?? ''));
    $iptu       = sonum((string)($row['iptu']       ?? ''));
    $area       = (string)($row['areaimovel']   ?? '');
    $quartos    = (string)($row['quartos']      ?? '');
    $banheiros  = (string)($row['banheiros']    ?? '');
    $suites     = (string)($row['suitesqtd']    ?? '');
    $garagem    = (string)($row['garagemvagas'] ?? '');
    $rua        = (string)($row['rua']          ?? '');
    $bairro     = (string)($row['bairro']       ?? '');
    $cidade     = (string)($row['cidade']       ?? '');
    $cep        = sonum((string)($row['cep']    ?? ''));

    $pets_raw   = strtolower(trim((string)($row['aceitapets'] ?? '')));
    $aceita_pet = ($pets_raw === 'sim' || $pets_raw === '1') ? '1' : '0';

    $descricao  = str_replace('&', 'e', (string)($row['info_adicional'] ?? ''));
    $link       = SITE_URL . '/property.html?id=' . urlencode($id);
    $data_atual = fmt_data((string)($row['created_at'] ?? ''));

    $fotos      = extrair_fotos($row);
    $area_comum = extrair_lista($row, 'arealazeritens');

    echo "    <imovel>\n";
    echo tag('referencia',               $id);
    echo tag('codigo_cliente',           $id);
    echo tag('link_cliente',             $link);
    echo tag('titulo',                   $titulo);
    echo tag('transacao',                $trans1);
    echo tag('transacao2',               $trans2);
    echo tag('finalidade',               'RE');
    echo tag('finalidade2',              '');
    echo tag('destaque',                 '0');
    echo tag('tipo',                     $tipo);
    echo tag('tipo2',                    '');
    echo tag('valor',                    $preco_venda   > 0 ? sonum((string)$preco_venda)   : '');
    echo tag('valor_locacao',            $preco_aluguel > 0 ? sonum((string)$preco_aluguel) : '');
    echo tag('valor_iptu',               $iptu);
    echo tag('valor_condominio',         $condominio);
    echo tag('area_total',               $area);
    echo tag('area_util',                $area);
    echo tag('conservacao',              '');
    echo tag('quartos',                  $quartos);
    echo tag('suites',                   $suites);
    echo tag('garagem',                  $garagem);
    echo tag('banheiro',                 $banheiros);
    echo tag('closet',                   '');
    echo tag('salas',                    '');
    echo tag('despensa',                 '');
    echo tag('bar',                      '');
    echo tag('cozinha',                  '1');
    echo tag('quarto_empregada',         '');
    echo tag('escritorio',               '');
    echo tag('area_servico',             '');
    echo tag('lareira',                  '');
    echo tag('varanda',                  '');
    echo tag('lavanderia',               '');
    echo tag('aceita_pet',               $aceita_pet);
    echo tag('estado',                   ESTADO_PADRAO);
    echo tag('cidade',                   $cidade);
    echo tag('bairro',                   $bairro);
    echo tag('cep',                      $cep);
    echo tag('endereco',                 $rua);
    echo tag('numero',                   '');
    echo tag('complemento',              '');
    echo tag('esconder_endereco_imovel', '0');
    echo tag('descritivo',               $descricao);

    echo "        <fotos_imovel>\n";
    foreach ($fotos as $url_foto) {
        echo "            <foto>\n";
        echo "                <url>" . x($url_foto) . "</url>\n";
        echo "                <data_atualizacao>" . x($data_atual) . "</data_atualizacao>\n";
        echo "            </foto>\n";
    }
    echo "        </fotos_imovel>\n";

    echo tag('data_atualizacao', $data_atual);
    echo tag('latitude',         (string)($row['latitude']  ?? ''));
    echo tag('longitude',        (string)($row['longitude'] ?? ''));
    echo tag('video',            '');
    echo tag('tour_360',         '');

    echo "        <area_comum>\n";
    foreach ($area_comum as $item) echo "            <item>" . x($item) . "</item>\n";
    echo "        </area_comum>\n";

    echo "        <area_privativa/>\n";

    echo tag('aceita_troca',    '');
    echo tag('periodo_locacao', '');
    echo "    </imovel>\n";
}

echo '    </imoveis>' . "\n";
echo '</Document>' . "\n";