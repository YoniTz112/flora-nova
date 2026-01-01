const translateMap = {
  // pratos
  "שניצל בבגט": "Schnitzel",
  "שווארמה בבגט": "Shawarma",
  "המבורגר": "Hambúrguer",

  // acompanhamentos
  "צ’יפס בצד": "Batata frita",
  "חומוס": "Hoummus",
  "חריף בצד": "Pimenta",
  "סלט ישראלי": "Salada",
  "כרוב לבן": "Repolho verde",
  "כרוב סגול": "Repolho roxo",
  "עגבניה": "Tomate",
  "בצל": "Cebola",
  "חסה": "Alface",
  "תוספת קציצה": "Mais uma carne",
  "רוטב צ'יפוטלה בצד": "Molho Chipotle",

  // bebidas
  "צ’יפס": "Batata frita",
  "קוקה קולה": "Coca",
  "קולה זירו": "Coca Zero",
  "מים": "Água",
  "סודה": "Água com gás",

  // shabat
  "חלה לשבת": "Chalá de Shabat",
  "בקבוק יין (מיץ ענבים)": "Suco de uva",
  "קופסת מטבוחה (200גר)": "Matbucha 200g",
  "קופסת חומוס (200גר)": "Hoummus 200g",
  "קופסת טחינה (200גר)": "Tahini 200g",
  "ערכה לשבת": "Kit de Shabat"
};

function translate(text) {
  return translateMap[text] || text;
}
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// -------------------- SHABAT SYSTEM PERSISTENCE --------------------
const SHABAT_STATE_FILE = path.join(__dirname, "shabat_state.json");

// Função para ler o estado do Shabat do arquivo
function readShabatState() {
  try {
    if (fs.existsSync(SHABAT_STATE_FILE)) {
      const data = fs.readFileSync(SHABAT_STATE_FILE, "utf8");
      return JSON.parse(data).active;
    }
  } catch (error) {
    console.error("Erro ao ler o estado do Shabat:", error);
  }
  return false; // Padrão para desativado se o arquivo não existir ou houver erro
}

// Função para escrever o estado do Shabat no arquivo
function writeShabatState(active) {
  try {
    fs.writeFileSync(SHABAT_STATE_FILE, JSON.stringify({ active }), "utf8");
    return true;
  } catch (error) {
    console.error("Erro ao escrever o estado do Shabat:", error);
    return false;
  }
}

let shabatActive = readShabatState(); // Inicializa com o estado persistido

// Lista de pedidos (temporária)
let orders = [];

// Rota para ver status
app.get("/shabat-status", (req, res) => {
  res.json({ active: shabatActive });
});

// Rota para ativar
app.post("/shabat/on", (req, res) => {
  shabatActive = true;
  writeShabatState(shabatActive);
  console.log("🔵 Shabat ativado");
  res.json({ success: true, active: shabatActive });
});

// Rota para desativar
app.post("/shabat/off", (req, res) => {
  shabatActive = false;
  writeShabatState(shabatActive);
  console.log("⚪ Shabat desativado");
  res.json({ success: true, active: shabatActive });
});

// -------------------- API PEDIDOS --------------------
app.post("/orders", (req, res) => {
  const order = req.body;
  order.time = new Date().toISOString();

  // traduz itens
  order.items = order.items.map(item => ({
    ...item,
    name: translate(item.name),
    toppings: item.toppings.map(t => translate(t))
  }));

  // traduz drinks
  order.drinks = order.drinks.map(drink => ({
    ...drink,
    name: translate(drink.name)
  }));

  orders.push(order);
  console.log("🖨 Pedido traduzido para cozinha:", order);

  res.json({ message: "Pedido recebido!" });
});

// GET pedidos (para orders.html)
app.get("/orders", (req, res) => {
  res.json(orders);
});

// ==================== DELETE ONE ORDER ====================
app.delete("/orders/:idx", (req, res) => {
  const idx = parseInt(req.params.idx, 10);

  if (isNaN(idx) || idx < 0 || idx >= orders.length) {
    return res.status(400).json({ error: "Índice inválido" });
  }

  orders.splice(idx, 1);
  console.log(`🗑 Pedido ${idx} apagado`);
  res.json({ success: true });
});

// ==================== DELETE ALL ORDERS ====================
app.delete("/orders", (req, res) => {
  orders = [];
  console.log("🗑 Todos os pedidos apagados");
  res.json({ success: true });
});

// -------------------- FRONT-END --------------------
// Cria um diretório 'public' e salva os arquivos HTML dentro dele
app.use(express.static(path.join(__dirname, "public")));

// Rota para orders.html (administração)
app.get("/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/orders.html"));
});

// Rota principal (cardápio)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// -------------------- Start Server --------------------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});