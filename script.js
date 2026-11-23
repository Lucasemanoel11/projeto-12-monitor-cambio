const CHAVE_STORAGE = "cotacoes_caderno_cambio";
const paresPadrao = ["USD-BRL", "EUR-BRL", "BTC-BRL"];

let estado = [];

const formularioMoeda = document.querySelector("#formulario-moeda");
const campoCodigoMoeda = document.querySelector("#codigo-moeda");
const botaoAtualizar = document.querySelector("#botao-atualizar");
const statusCambio = document.querySelector("#status-cambio");
const containerCotacoes = document.getElementById("cotacoes");

function salvarEstado(dados) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
}

function carregarEstadoSalvo() {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  if (!salvo) {
    return null;
  }

  try {
    const convertido = JSON.parse(salvo);
    return Array.isArray(convertido) ? convertido : null;
  } catch (erro) {
    return null;
  }
}

async function buscarCotacoes(moedas) {
  const listaParametro = moedas.join(",");
  const resposta = await fetch(`https://economia.awesomeapi.com.br/last/${listaParametro}`);
  if (!resposta.ok) {
    throw new Error("Falha ao consultar cotações");
  }
  return await resposta.json();
}

function normalizarPar(texto) {
  const limpo = texto.trim().toUpperCase().replace(/\s+/g, "");
  if (!limpo) {
    return "";
  }
  if (limpo.includes("-")) {
    return limpo;
  }
  return `${limpo}-BRL`;
}

function renderizar(dadosEstado) {
  containerCotacoes.innerHTML = dadosEstado
    .map((moeda) => {
      const classeFavorita = moeda.favorita ? "card favorita" : "card";
      const textoFavorito = moeda.favorita ? "Favorita ★" : "Favoritar";
      return `
        <article class="${classeFavorita}" data-par="${moeda.par}">
          <div class="topo-card">
            <strong>${moeda.par}</strong>
            <span>${moeda.nome}</span>
          </div>
          <p class="valor-cotacao">R$ ${moeda.valor}</p>
          <div class="acoes-card">
            <button type="button" class="btn-favorito" data-par="${moeda.par}">${textoFavorito}</button>
            <button type="button" class="btn-remover" data-par="${moeda.par}">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function sincronizarPares(listaPares, favoritosAnteriores = {}) {
  if (listaPares.length === 0) {
    estado = [];
    salvarEstado(estado);
    renderizar(estado);
    statusCambio.textContent = "Nenhuma moeda na lista. Adicione um par para acompanhar.";
    return;
  }

  statusCambio.textContent = "A atualizar cotações...";

  try {
    const dadosApi = await buscarCotacoes(listaPares);
    const chavesRetornadas = Object.values(dadosApi);

    if (chavesRetornadas.length === 0) {
      statusCambio.textContent = "Nenhuma cotação encontrada para o par informado.";
      return;
    }

    const novasMoedas = chavesRetornadas.map((item) => {
      const parChave = `${item.code}-${item.codein}`;
      const valorNumerico = Number(item.bid);
      return {
        par: parChave,
        nome: item.name || parChave,
        valor: Number.isNaN(valorNumerico) ? item.bid : valorNumerico.toFixed(2),
        favorita: Boolean(favoritosAnteriores[parChave])
      };
    });

    const paresExistentes = estado.map((m) => m.par);
    const combinados = [...estado];

    for (const nova of novasMoedas) {
      const indice = combinados.findIndex((m) => m.par === nova.par);
      if (indice >= 0) {
        combinados[indice] = { ...nova, favorita: combinados[indice].favorita || nova.favorita };
      } else if (!paresExistentes.includes(nova.par)) {
        combinados.push(nova);
      }
    }

    estado = combinados;
    salvarEstado(estado);
    renderizar(estado);
    statusCambio.textContent = "Cotações atualizadas e guardadas no navegador.";
  } catch (erro) {
    statusCambio.textContent = "Não foi possível carregar as cotações agora. Exibindo dados guardados se existirem.";
    renderizar(estado);
  }
}

formularioMoeda.addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const parFormatado = normalizarPar(campoCodigoMoeda.value);

  if (!parFormatado) {
    campoCodigoMoeda.focus();
    return;
  }

  if (estado.some((item) => item.par === parFormatado)) {
    statusCambio.textContent = `O par ${parFormatado} já está na lista.`;
    campoCodigoMoeda.value = "";
    return;
  }

  campoCodigoMoeda.value = "";
  const mapaFavoritos = {};
  for (const item of estado) {
    mapaFavoritos[item.par] = item.favorita;
  }

  await sincronizarPares([...estado.map((i) => i.par), parFormatado], mapaFavoritos);
});

botaoAtualizar.addEventListener("click", async function () {
  if (estado.length === 0) {
    return;
  }
  const mapaFavoritos = {};
  for (const item of estado) {
    mapaFavoritos[item.par] = item.favorita;
  }
  await sincronizarPares(estado.map((i) => i.par), mapaFavoritos);
});

containerCotacoes.addEventListener("click", function (evento) {
  const botao = evento.target.closest("button");
  if (!botao || !botao.dataset.par) {
    return;
  }

  const parAlvo = botao.dataset.par;

  if (botao.classList.contains("btn-favorito")) {
    estado = estado.map((item) =>
      item.par === parAlvo ? { ...item, favorita: !item.favorita } : item
    );
    salvarEstado(estado);
    renderizar(estado);
  } else if (botao.classList.contains("btn-remover")) {
    estado = estado.filter((item) => item.par !== parAlvo);
    salvarEstado(estado);
    renderizar(estado);
  }
});

async function iniciarAplicacao() {
  const estadoSalvo = carregarEstadoSalvo();
  if (estadoSalvo && estadoSalvo.length > 0) {
    estado = estadoSalvo;
    renderizar(estado);
    const mapaFavoritos = {};
    for (const item of estado) {
      mapaFavoritos[item.par] = item.favorita;
    }
    await sincronizarPares(estado.map((i) => i.par), mapaFavoritos);
  } else {
    await sincronizarPares(paresPadrao);
  }
}

iniciarAplicacao();