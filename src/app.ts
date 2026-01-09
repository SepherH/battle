const fs = require('fs');
const express = require("express");
const showdown = require('showdown');

// Default port
const port = 3000;

const app = express();
const converter = new showdown.Converter();
converter.setOption('tables', true);

// 解析 JSON body
app.use(express.json());

// Battle 類型加權值配置 (方便擴充)
const BATTLE_WEIGHTS: Record<number, number[]> = {
    0: [1, 2, 1],
    1: [1, 1, 5],
    2: [3, 1, 2],
};

// 定義型別
interface PlayerInput {
    properties: number[];
}

interface BattleRequest {
    battle: number;
    playerA: PlayerInput;
    playerB: PlayerInput;
}

interface PlayerResult {
    weightedValue: number;
    rate: number;
}

interface BattleSuccessResponse {
    winner: number;
    playerA: PlayerResult;
    playerB: PlayerResult;
}

interface BattleErrorResponse {
    error: string;
}

// 驗證玩家數值是否有效 (不可為負)
function validatePlayerProperties(properties: number[]): boolean {
    return properties.every(val => val >= 0);
}

// 計算加權值
function calculateWeightedValue(properties: number[], weights: number[]): number {
    return properties.reduce((sum, val, idx) => sum + val * weights[idx], 0);
}

// 產生攻擊加成 (0 到 1 之間的隨機數，取一位小數)
function generateRate(): number {
    return Math.round(Math.random() * 10) / 10;
}

// 計算最終攻擊力
function calculateFinalPower(weightedValue: number, rate: number): number {
    return weightedValue * (1 + rate);
}

app.get("/", (req, res) => {
    const text = fs.readFileSync('./README.md').toString();
    const html = converter.makeHtml(text);
    res.send(html);
});

// Battle 測試網頁
app.get("/demo", (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Battle Demo</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { text-align: center; color: #333; }
        .container {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .player-card {
            flex: 1;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .player-card h2 {
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
        }
        .player-card.player-a h2 { color: #e74c3c; }
        .player-card.player-b h2 { color: #3498db; }
        label { display: block; margin: 10px 0 5px; font-weight: 500; }
        input[type="number"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        .battle-select {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 15px;
            background: #2ecc71;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover { background: #27ae60; }
        .result {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-top: 20px;
            display: none;
        }
        .result.show { display: block; }
        .winner-banner {
            text-align: center;
            padding: 20px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .winner-a { background: #e74c3c; color: white; }
        .winner-b { background: #3498db; color: white; }
        .result-details {
            display: flex;
            gap: 20px;
        }
        .result-player {
            flex: 1;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        .result-player h3 { margin-top: 0; }
        .result-player.player-a h3 { color: #e74c3c; }
        .result-player.player-b h3 { color: #3498db; }
        .stat { margin: 8px 0; }
        .stat-label { color: #666; }
        .stat-value { font-weight: bold; font-size: 18px; }
        .error-msg {
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .weight-info {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>Battle Demo</h1>

    <div class="battle-select">
        <label for="battle">Battle Type</label>
        <select id="battle" onchange="updateWeightInfo()">
            <option value="0">Battle 0</option>
            <option value="1">Battle 1</option>
            <option value="2">Battle 2</option>
        </select>
        <div class="weight-info" id="weightInfo">Weight: [1, 2, 1]</div>
    </div>

    <div class="container">
        <div class="player-card player-a">
            <h2>Player A</h2>
            <label>Property 0</label>
            <input type="number" id="a0" value="30">
            <label>Property 1</label>
            <input type="number" id="a1" value="23">
            <label>Property 2</label>
            <input type="number" id="a2" value="45">
        </div>
        <div class="player-card player-b">
            <h2>Player B</h2>
            <label>Property 0</label>
            <input type="number" id="b0" value="47">
            <label>Property 1</label>
            <input type="number" id="b1" value="15">
            <label>Property 2</label>
            <input type="number" id="b2" value="33">
        </div>
    </div>

    <button onclick="doBattle()">Battle!</button>

    <div class="result" id="result"></div>

    <script>
        const weights = {
            0: [1, 2, 1],
            1: [1, 1, 5],
            2: [3, 1, 2]
        };

        function updateWeightInfo() {
            const battle = document.getElementById('battle').value;
            document.getElementById('weightInfo').textContent = 'Weight: [' + weights[battle].join(', ') + ']';
        }

        async function doBattle() {
            const battle = parseInt(document.getElementById('battle').value);
            const playerA = {
                properties: [
                    parseInt(document.getElementById('a0').value) || 0,
                    parseInt(document.getElementById('a1').value) || 0,
                    parseInt(document.getElementById('a2').value) || 0
                ]
            };
            const playerB = {
                properties: [
                    parseInt(document.getElementById('b0').value) || 0,
                    parseInt(document.getElementById('b1').value) || 0,
                    parseInt(document.getElementById('b2').value) || 0
                ]
            };

            try {
                const response = await fetch('/battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ battle, playerA, playerB })
                });
                const data = await response.json();
                displayResult(data);
            } catch (err) {
                displayError('Request failed');
            }
        }

        function displayResult(data) {
            const resultDiv = document.getElementById('result');
            resultDiv.classList.add('show');

            if (data.error) {
                resultDiv.innerHTML = '<div class="error-msg">' + data.error + '</div>';
                return;
            }

            const winnerClass = data.winner === 0 ? 'winner-a' : 'winner-b';
            const winnerName = data.winner === 0 ? 'Player A' : 'Player B';
            const finalA = (data.playerA.weightedValue * (1 + data.playerA.rate)).toFixed(1);
            const finalB = (data.playerB.weightedValue * (1 + data.playerB.rate)).toFixed(1);

            resultDiv.innerHTML =
                '<div class="winner-banner ' + winnerClass + '">' + winnerName + ' Wins!</div>' +
                '<div class="result-details">' +
                    '<div class="result-player player-a">' +
                        '<h3>Player A</h3>' +
                        '<div class="stat"><span class="stat-label">Weighted Value:</span> <span class="stat-value">' + data.playerA.weightedValue + '</span></div>' +
                        '<div class="stat"><span class="stat-label">Rate:</span> <span class="stat-value">' + data.playerA.rate + '</span></div>' +
                        '<div class="stat"><span class="stat-label">Final Power:</span> <span class="stat-value">' + finalA + '</span></div>' +
                    '</div>' +
                    '<div class="result-player player-b">' +
                        '<h3>Player B</h3>' +
                        '<div class="stat"><span class="stat-label">Weighted Value:</span> <span class="stat-value">' + data.playerB.weightedValue + '</span></div>' +
                        '<div class="stat"><span class="stat-label">Rate:</span> <span class="stat-value">' + data.playerB.rate + '</span></div>' +
                        '<div class="stat"><span class="stat-label">Final Power:</span> <span class="stat-value">' + finalB + '</span></div>' +
                    '</div>' +
                '</div>';
        }

        function displayError(msg) {
            const resultDiv = document.getElementById('result');
            resultDiv.classList.add('show');
            resultDiv.innerHTML = '<div class="error-msg">' + msg + '</div>';
        }
    </script>
</body>
</html>`;
    res.send(html);
});

app.post('/battle', (req, res) => {
    const { battle, playerA, playerB } = req.body as BattleRequest;

    // 驗證 battle 類型是否存在
    const weights = BATTLE_WEIGHTS[battle];
    if (!weights) {
        return res.status(400).json({ error: 'Invalid battle type' });
    }

    // 驗證玩家數值是否為負
    if (!validatePlayerProperties(playerA.properties) ||
        !validatePlayerProperties(playerB.properties)) {
        return res.json({ error: 'Invalid value' } as BattleErrorResponse);
    }

    // 計算加權值
    const weightedValueA = calculateWeightedValue(playerA.properties, weights);
    const weightedValueB = calculateWeightedValue(playerB.properties, weights);

    // 產生攻擊加成
    const rateA = generateRate();
    const rateB = generateRate();

    // 計算最終攻擊力並決定勝負
    const finalPowerA = calculateFinalPower(weightedValueA, rateA);
    const finalPowerB = calculateFinalPower(weightedValueB, rateB);

    const winner = finalPowerA > finalPowerB ? 0 : 1;

    const response: BattleSuccessResponse = {
        winner,
        playerA: {
            weightedValue: weightedValueA,
            rate: rateA,
        },
        playerB: {
            weightedValue: weightedValueB,
            rate: rateB,
        },
    };

    res.json(response);
})

app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});