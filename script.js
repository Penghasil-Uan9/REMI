const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const suits = [
    {symbol:"♠", color:"black"},
    {symbol:"♥", color:"red"},
    {symbol:"♦", color:"red"},
    {symbol:"♣", color:"black"}
];

let deck = [];
let removedHistory = [];

function generateDeck() {
    deck = [];
    suits.forEach(s => {
        ranks.forEach(r => {
            deck.push({
                name: r + s.symbol,
                rank: r,
                suit: s.symbol,
                color: s.color
            });
        });
    });
}

function renderDeck() {
    const openDiv = document.getElementById("openCards");
    const closedDiv = document.getElementById("closedCards");
    const select = document.getElementById("cardSelect");

    openDiv.innerHTML = "";
    closedDiv.innerHTML = "";
    select.innerHTML = '<option value="">Pilih kartu...</option>';

    deck.forEach(card => {
        // kartu terbuka
        const c = document.createElement("div");
        c.className = "card " + (card.color === "red" ? "red" : "");
        c.textContent = card.name;
        c.dataset.card = card.name;

        openDiv.appendChild(c);

        // masuk dropdown
        const opt = document.createElement("option");
        opt.value = card.name;
        opt.textContent = card.name;
        select.appendChild(opt);
    });

    document.getElementById("openCount").textContent = deck.length;
    document.getElementById("closedCount").textContent = 52 - deck.length;
}

function searchCard(name) {
    const resultDiv = document.getElementById("searchResult");
    resultDiv.innerHTML = "";

    const cardObj = deck.find(c => c.name === name);
    if (!cardObj) return;

    const c = document.createElement("div");
    c.className = "card " + (cardObj.color === "red" ? "red" : "");
    c.textContent = cardObj.name;
    c.dataset.card = cardObj.name;

    // klik → kartu hilang dari kolom 1
    c.onclick = () => removeCard(cardObj.name);

    resultDiv.appendChild(c);
}

function removeCard(name) {
    const index = deck.findIndex(c => c.name === name);
    if (index === -1) return;

    removedHistory.push(deck[index]);  // untuk undo
    deck.splice(index, 1);

    renderDeck();
    document.getElementById("searchResult").innerHTML = "";
}

function undo() {
    if (removedHistory.length === 0) return;

    const last = removedHistory.pop();
    deck.push(last);

    deck.sort((a,b) => a.name.localeCompare(b.name)); // rapi
    renderDeck();
}

function resetGame() {
    generateDeck();
    removedHistory = [];
    renderDeck();
}

document.getElementById("cardSelect").onchange = e => {
    if (e.target.value !== "") {
        searchCard(e.target.value);
    }
};

document.getElementById("undoBtn").onclick = undo;
document.getElementById("resetBtn").onclick = resetGame;

generateDeck();
renderDeck();