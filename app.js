/* Rhesumo — Diário de Bordo do Grupo Rhes. Página estática: edição do dia, arquivo e busca avançada.
   window.RHESUMO = { base: "<url do site público>/", diretoria: null | { id, interacoes, radar, licitacoes } } */
(function () {
  const CFG = window.RHESUMO || {};
  const BASE = CFG.base || "";
  const DIR = CFG.diretoria || null;
  const $ = (s) => document.querySelector(s);
  const app = $("#app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const IDIOMAS = { pt: "português", en: "inglês", es: "espanhol", fr: "francês", it: "italiano", de: "alemão" };
  const extenso = (iso) => { const d = new Date(iso + "T12:00:00"); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
  const curta = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");
  let INDICE = null;
  const cache = {};

  async function getJSON(p) { const r = await fetch(BASE + p, { cache: "no-cache" }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); }
  async function indice() { return INDICE || (INDICE = await getJSON("dados/indice.json")); }
  async function edicao(id) { return cache[id] || (cache[id] = await getJSON(`dados/edicoes/${id}.json`)); }

  function marcar(texto, termos) {
    let h = esc(texto);
    if (!termos.length) return h;
    const n = norm(h);
    const faixas = [];
    termos.forEach((t) => { const tn = norm(esc(t)); let i = 0; while (tn && (i = n.indexOf(tn, i)) >= 0) { faixas.push([i, i + tn.length]); i += tn.length; } });
    if (!faixas.length) return h;
    faixas.sort((a, b) => a[0] - b[0]);
    let out = "", pos = 0;
    for (const [a, b] of faixas) { if (a < pos) continue; out += h.slice(pos, a) + "<mark>" + h.slice(a, b) + "</mark>"; pos = b; }
    return out + h.slice(pos);
  }

  function badges(n) {
    let b = "";
    if (n.alerta) b += `<span class="badge ${n.severo ? "b-grave" : "b-alerta"}">${n.severo ? "alerta severo" : "alerta"}</span>`;
    if (n.tipo === "estudo") b += `<span class="badge b-estudo">estudo</span>`;
    if (n.idioma && n.idioma !== "pt") b += `<span class="badge b-idioma">original em ${IDIOMAS[n.idioma] || n.idioma}</span>`;
    return b;
  }
  const fonteLinha = (n) => `<div class="fonte">Fonte: <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.fonte)}</a>${n.publicado_em ? " · publicado em " + curta(n.publicado_em) : ""}</div>`;
  const tituloLink = (n, html) => n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener" title="Abrir a matéria original">${html}</a>` : html;
  function porque(url) {
    if (!DIR || !DIR.interacoes) return "";
    const i = DIR.interacoes[url]; if (!i) return "";
    const pub = (i.publico || []).map((p) => `<span class="badge b-pub">${esc(p)}</span>`).join(" ");
    return `<div class="porque"><b>Por que importa:</b> ${esc(i.por_que_importa)} ${pub}</div>`;
  }

  function cardNoticia(n) {
    const r1 = DIR && DIR.interacoes && DIR.interacoes[n.url] && DIR.interacoes[n.url].relevancia === 1;
    return `<article class="card${r1 ? " r1" : ""}"><div class="meta">${badges({ tipo: n.tipo, idioma: n.idioma_original })}</div>
      <h3>${tituloLink(n, esc(n.titulo))}</h3><p>${esc(n.resumo)}</p>${porque(n.url)}${fonteLinha(n)}</article>`;
  }
  function cardAlerta(a) {
    return `<div class="alerta${a.severo ? " grave" : ""}"><h3>${tituloLink(a, esc(a.titulo))}</h3>
      <div class="loc">${esc(a.local)}${a.periodo ? " · " + esc(a.periodo) : ""}</div>
      <p>${esc(a.resumo)}</p>${DIR && DIR.impactos && DIR.impactos[a.url] ? `<div class="impacto"><b>Impacto para o grupo:</b> ${esc(DIR.impactos[a.url])}</div>` : ""}
      ${a.idioma_original && a.idioma_original !== "pt" ? `<div class="meta">${badges({ idioma: a.idioma_original })}</div>` : ""}${porque(a.url)}${fonteLinha(a)}</div>`;
  }

  function navTopo(ativo) {
    document.querySelectorAll("header.top nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === ativo));
  }

  async function verEdicao(id) {
    navTopo("hoje");
    const idx = await indice();
    if (!id) id = DIR ? DIR.id : idx.edicoes[0].id;
    const pos = idx.edicoes.findIndex((e) => e.id === id);
    if (pos < 0) { app.innerHTML = `<p class="vazio">Edição não encontrada.</p>`; return; }
    const e = await edicao(id);
    const comAnalise = DIR && DIR.id === id;
    const ant = idx.edicoes[pos + 1], prox = idx.edicoes[pos - 1];
    const opcoes = idx.edicoes.map((x) => `<option value="${x.id}"${x.id === id ? " selected" : ""}>${curta(x.data)}${x.semanal ? " · semana" : ""} — nº ${x.numero}</option>`).join("");
    let h = `<div class="cab-ed"><div><span class="ed">${e.semanal ? "Rhesumo da Semana" : "Edição"} nº ${e.numero}</span>
      <div class="data">${extenso(e.data)}</div></div>
      <div class="navdias">${ant ? `<a href="#/e/${ant.id}">‹ anterior</a>` : ""}<select id="selEd" aria-label="Escolher edição">${opcoes}</select>${prox ? `<a href="#/e/${prox.id}">próxima ›</a>` : ""}</div></div>
      <div class="manchete"><small>${e.semanal ? "Manchete da semana" : "Manchete do dia"}</small><h1>${esc(e.manchete)}</h1></div>`;
    if (DIR && !comAnalise) h += `<p class="res-info">Esta é a versão pública desta edição. As análises da Diretoria aparecem apenas na edição do link recebido.</p>`;
    if (e.alertas && e.alertas.length) h += `<div class="alertas"><h2>⚠ Alertas de viagem</h2>${e.alertas.map(cardAlerta).join("")}</div>`;
    h += `<div class="bloco"><h2>${e.semanal ? "A semana em resumo" : "Resumo executivo"}</h2><ul>${(comAnalise && DIR.resumo_executivo ? DIR.resumo_executivo : e.resumo_executivo).map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`;
    for (const s of e.secoes) h += `<section class="sec"><h2>${esc(s.titulo)}</h2>${s.noticias.map(cardNoticia).join("")}</section>`;
    if (comAnalise && DIR.licitacoes && DIR.licitacoes.length)
      h += `<section class="sec"><h2>Licitações & Oportunidades<span class="priv">Diretoria</span></h2>${DIR.licitacoes.map(cardNoticia).join("")}</section>`;
    if (comAnalise && DIR.radar && DIR.radar.length)
      h += `<div class="radar"><h2>Radar<span class="priv">Diretoria</span></h2><ul>${DIR.radar.map((r) => `<li>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.titulo)}</a>` : esc(r.titulo)}</li>`).join("")}</ul></div>`;
    app.innerHTML = h;
    $("#selEd").onchange = (ev) => (location.hash = "#/e/" + ev.target.value);
    window.scrollTo(0, 0);
  }

  async function verArquivo() {
    navTopo("arquivo");
    const idx = await indice();
    app.innerHTML = `<h2>Todas as edições</h2><ul class="lista-ed">${idx.edicoes.map((e) => `<li><a href="#/e/${e.id}"><b>${curta(e.data)}${e.semanal ? " · Rhesumo da Semana" : ""}</b></a> · nº ${e.numero} · ${e.n} notícias${e.alertas ? ` · ${e.alertas} alerta(s)` : ""}<br>${esc(e.manchete)}</li>`).join("")}</ul>`;
  }

  // ---------- busca avançada ----------
  function termosDe(q) {
    const t = []; q.replace(/"([^"]+)"|(\S+)/g, (_, a, b) => { const x = a || b; if (x.startsWith("-")) return; t.push(x); });
    const neg = (q.match(/(^|\s)-(\S+)/g) || []).map((x) => x.trim().slice(1));
    return { t, neg };
  }
  async function verBusca(params) {
    navTopo("busca");
    const idx = await indice();
    const uniq = (k) => [...new Set(idx.itens.map((i) => i[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
    const opt = (lista, sel, rot) => `<option value="">${rot}</option>` + lista.map((v) => `<option${v === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
    const p = Object.fromEntries(params);
    app.innerHTML = `<form class="busca" id="fBusca" autocomplete="off">
      <div class="linha"><input class="q" name="q" placeholder='Buscar: palavras, "frase exata", -excluir' value="${esc(p.q || "")}" aria-label="Termos da busca"><button>Buscar</button><button type="button" class="sec" id="limpar">Limpar</button></div>
      <div class="linha" style="margin-top:8px">
        <label>De<input type="date" name="de" value="${esc(p.de || "")}"></label>
        <label>Até<input type="date" name="ate" value="${esc(p.ate || "")}"></label>
        <label>Seção<select name="secao">${opt(uniq("secao"), p.secao, "Todas")}</select></label>
        <label>Fonte<select name="fonte">${opt(uniq("fonte"), p.fonte, "Todas")}</select></label>
        <label>Tipo<select name="tipo">${opt(["notícia", "estudo", "alerta"], p.tipo, "Todos")}</select></label>
        <label>Idioma original<select name="idioma">${`<option value="">Todos</option>` + uniq("idioma").map((v) => `<option value="${v}"${v === p.idioma ? " selected" : ""}>${IDIOMAS[v] || v}</option>`).join("")}</select></label>
      </div>
      <div class="linha" style="margin-top:8px"><label class="chk"><input type="checkbox" name="severo" value="1"${p.severo ? " checked" : ""}> só alertas severos</label>
        <label class="chk"><input type="checkbox" name="titulo" value="1"${p.titulo ? " checked" : ""}> buscar só no título</label>
        <label>Ordenar<select name="ordem"><option value="data"${p.ordem !== "rel" ? " selected" : ""}>mais recentes</option><option value="rel"${p.ordem === "rel" ? " selected" : ""}>relevância</option></select></label></div>
      <div class="dica">Busca sem acento e sem diferenciar maiúsculas. Vários termos = todos precisam aparecer. Use aspas para frase exata e - para excluir.</div>
    </form><div id="res"></div>`;
    const f = $("#fBusca");
    f.onsubmit = (ev) => { ev.preventDefault(); const sp = new URLSearchParams(); new FormData(f).forEach((v, k) => v && sp.set(k, v)); location.hash = "#/busca?" + sp.toString(); };
    $("#limpar").onclick = () => (location.hash = "#/busca");
    if (![...params.keys()].length) { $("#res").innerHTML = `<p class="res-info">${idx.itens.length} notícias e alertas em ${idx.edicoes.length} edições.</p>`; return; }

    const { t, neg } = termosDe(p.q || "");
    const tn = t.map(norm), nn = neg.map(norm);
    let res = idx.itens.filter((i) => {
      if (p.de && (i.publicado_em || i.data) < p.de) return false;
      if (p.ate && (i.publicado_em || i.data) > p.ate) return false;
      if (p.secao && i.secao !== p.secao) return false;
      if (p.fonte && i.fonte !== p.fonte) return false;
      if (p.tipo === "alerta" && !i.alerta) return false;
      if (p.tipo === "estudo" && i.tipo !== "estudo") return false;
      if (p.tipo === "notícia" && (i.alerta || i.tipo === "estudo")) return false;
      if (p.idioma && i.idioma !== p.idioma) return false;
      if (p.severo && !i.severo) return false;
      const alvo = norm(p.titulo ? i.titulo : [i.titulo, i.resumo, i.local, i.fonte, i.secao].join(" "));
      return tn.every((x) => alvo.includes(x)) && !nn.some((x) => alvo.includes(x));
    });
    // em caso de notícia repetida (diária + semanal), mostra uma vez
    const vistos = new Set(); res = res.filter((i) => (vistos.has(i.url) ? false : vistos.add(i.url)));
    if (p.ordem === "rel") {
      const pont = (i) => tn.reduce((s, x) => s + (norm(i.titulo).includes(x) ? 3 : 0) + (norm(i.resumo).split(x).length - 1), 0);
      res.sort((a, b) => pont(b) - pont(a) || (b.publicado_em || b.data).localeCompare(a.publicado_em || a.data));
    } else res.sort((a, b) => (b.publicado_em || b.data).localeCompare(a.publicado_em || a.data));
    const edNum = Object.fromEntries(idx.edicoes.map((e) => [e.id, e]));
    $("#res").innerHTML = `<p class="res-info">${res.length} resultado(s)</p>` + res.slice(0, 300).map((i) => `<article class="card${i.severo ? " r1" : ""}">
      <div class="meta">${badges(i)}<span>${esc(i.secao || "Alertas de viagem")}</span>${i.local ? `<span>· ${esc(i.local)}</span>` : ""}</div>
      <h3>${tituloLink(i, marcar(i.titulo, t))}</h3><p>${marcar(i.resumo, p.titulo ? [] : t)}</p>${fonteLinha(i)}
      <div class="fonte">Na edição: <a href="#/e/${i.ed}">${curta(edNum[i.ed].data)}${edNum[i.ed].semanal ? " (semana)" : ""} — nº ${edNum[i.ed].numero}</a></div></article>`).join("");
  }

  async function rota() {
    const h = location.hash || "#/";
    try {
      if (h.startsWith("#/e/")) await verEdicao(decodeURIComponent(h.slice(4)));
      else if (h.startsWith("#/busca")) await verBusca(new URLSearchParams(h.split("?")[1] || ""));
      else if (h.startsWith("#/arquivo")) await verArquivo();
      else await verEdicao(null);
    } catch (err) { app.innerHTML = `<p class="vazio">Não foi possível carregar o conteúdo agora. Tente recarregar a página.</p>`; console.error(err); }
  }
  // tema claro/escuro: segue o sistema até o leitor escolher
  const raizHtml = document.documentElement;
  const lerTema = () => { try { return localStorage.getItem("rhesumo-tema"); } catch (e) { return null; } };
  const escuroAgora = () => raizHtml.dataset.theme ? raizHtml.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (lerTema()) raizHtml.dataset.theme = lerTema();
  const nav = document.querySelector("header.top nav");
  if (nav) {
    const bt = document.createElement("button");
    bt.className = "tema"; bt.type = "button";
    const rot = () => { bt.textContent = escuroAgora() ? "☀ Claro" : "☾ Escuro"; bt.setAttribute("aria-label", escuroAgora() ? "Mudar para tema claro" : "Mudar para tema escuro"); };
    bt.onclick = () => { raizHtml.dataset.theme = escuroAgora() ? "light" : "dark"; try { localStorage.setItem("rhesumo-tema", raizHtml.dataset.theme); } catch (e) {} rot(); };
    rot(); nav.appendChild(bt);
  }
  window.addEventListener("hashchange", rota);
  rota();
})();
