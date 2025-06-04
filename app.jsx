
const { useState, useEffect, useRef } = React;

const AlphabetGameSimulator = () => {
    // ゲーム状態(処理)
    const refGameState = useRef('stopped'); // 'stopped', 'running', 'completed'
    const refAnimationSpeed = useRef('50');
    const refRequiredPowder = useRef('-1');

    // ゲーム状態(描画更新)
    const [gameState, setGameState] = useState(refGameState); 
    const [drawCount, setDrawCount] = useState(0);
    const [advancedDrawCount, setAdvancedDrawCount] = useState(0);
    const [synthesisCount, setSynthesisCount] = useState(0);
    const [powder, setPowder] = useState(0);
    const [animationSpeed, setAnimationSpeed] = useState(refAnimationSpeed.current);
    const [advancedProbability, setAdvancedProbability] = useState(1.0);
    const [selectedWords, setSelectedWords] = useState([true, true, true, true, true]); // どの単語を収集するか


    // アルファベット定義
    const alphabets = {
        rare: ['K', 'P', 'T', 'U'], // レア度上
        medium: ['A', 'I', 'N', 'S', 'V'], // レア度中
        common: ['B', 'E', 'R', 'C', 'D', 'F', 'G', 'H', 'J', 'L', 'M', 'O', 'Q', 'W', 'X', 'Y', 'Z'] // レア度下
    };

    const wordNames = [
        "STAR",
        "UNIVERSE",
        "PINKBEAN",
        "UNIVERSESTAR",
        "UNIVERSEPINKSTAR"
    ];
    const targetWords = wordNames.map(word => word.split(""));

    // アルファベット選択作成必要数
    const powderCost = { rare: 5000, medium: 1500, common: 100 };


    // 現在の配置状況
    const [currentPlacement, setCurrentPlacement] = useState(
        targetWords.map(word => word.map(() => null))
    );

    // 所持アルファベット（すべてのアルファベットをあらかじめ0で初期化）
    const [inventory, setInventory] = useState(() => {
        const initial = {};
        [...alphabets.rare, ...alphabets.medium, ...alphabets.common].forEach(letter => {
            initial[letter] = 0;
        });
        return initial;
    });

    // アニメーション用ログ
    const [animationLog, setAnimationLog] = useState([]);
    const [currentLogIndex, setCurrentLogIndex] = useState(0);

    const intervalRef = useRef(null);

    // 抽選関数
    const drawAlphabet = (isAdvanced = false) => {
        const rand = Math.random();
        let selectedAlphabet, rarity;

        if (isAdvanced) {
            // 上級抽選：レア度上のみ
            const rareAlphabets = alphabets.rare;
            selectedAlphabet = rareAlphabets[Math.floor(Math.random() * rareAlphabets.length)];
            rarity = 'rare';
        } else {
            // 通常抽選
            if (rand < 0.954635) {
                // レア度下 95.4635%
                const commonAlphabets = alphabets.common;
                selectedAlphabet = commonAlphabets[Math.floor(Math.random() * commonAlphabets.length)];
                rarity = 'common';
            } else {
                // レア度中 4.5365%
                const mediumAlphabets = alphabets.medium;
                selectedAlphabet = mediumAlphabets[Math.floor(Math.random() * mediumAlphabets.length)];
                rarity = 'medium';
            }
        }

        return { alphabet: selectedAlphabet, rarity };
    };

    // 合成抽選
    const synthesize = () => {
        const rand = Math.random();
        let selectedAlphabet, rarity;

        if (rand < 0.947) {
            // レア度下 94.7%
            const commonAlphabets = alphabets.common;
            selectedAlphabet = commonAlphabets[Math.floor(Math.random() * commonAlphabets.length)];
            rarity = 'common';
        } else if (rand < 0.992) {
            // レア度中 4.5%
            const mediumAlphabets = alphabets.medium;
            selectedAlphabet = mediumAlphabets[Math.floor(Math.random() * mediumAlphabets.length)];
            rarity = 'medium';
        } else {
            // レア度上 0.8%
            const rareAlphabets = alphabets.rare;
            selectedAlphabet = rareAlphabets[Math.floor(Math.random() * rareAlphabets.length)];
            rarity = 'rare';
        }

        return { alphabet: selectedAlphabet, rarity };
    };

    // パウダー必要数の計算(最初のみ行う)
    const calcRequiredPowder = () => {
        let letters = {rare: 0, medium: 0, common: 0};
        for (let wordIndex = 0; wordIndex < targetWords.length; wordIndex++) {
            if (!selectedWords[wordIndex]) continue; // 選択されていない単語はスキップ
            for (let letterIndex = 0; letterIndex < targetWords[wordIndex].length; letterIndex++) {
                const targetLetter = targetWords[wordIndex][letterIndex];

                if (alphabets.rare.includes(targetLetter)) letters.rare++;
                else if (alphabets.medium.includes(targetLetter)) letters.medium++;
                else letters.common++;
            }
        }
        return Object.keys(letters).reduce(
            (sum, key) => sum + letters[key] * powderCost[key],
            0
        );
    }

    // レア度に対応する色を取得
    const getRarityColor = (letter) => {
        if (alphabets.rare.includes(letter)) return 'bg-pink-500'; // ピンク
        else if (alphabets.medium.includes(letter)) return 'bg-yellow-500'; // 黄色
        else if (alphabets.common.indexOf(letter) < 3) return 'bg-purple-500'; // 紫
        else return 'bg-blue-500'; // 青
    };

    // シミュレーション実行
    const runSimulation = () => {
        setGameState(refGameState.current = 'running');
        setDrawCount(0);
        setAdvancedDrawCount(0);
        setSynthesisCount(0);
        setPowder(0);
        setCurrentPlacement(targetWords.map(word => word.map(() => null)));

        // インベントリを初期化（全て0）
        const initialInventory = {};
        [...alphabets.rare, ...alphabets.medium, ...alphabets.common].forEach(letter => {
            initialInventory[letter] = 0;
        });
        setInventory(initialInventory);

        setAnimationLog([]);
        setCurrentLogIndex(0);

        const log = [];
        let tempInventory = { ...initialInventory };
        let tempPlacement = targetWords.map(word => word.map(() => null));
        let tempPowder = 0;
        let tempDrawCount = 0;
        let tempAdvancedDrawCount = 0;
        let tempSynthesisCount = 0;

        // クリアまでのパウダー必要数
        let requiredPowder = calcRequiredPowder();

        while (true) {
            tempDrawCount++;

            // 通常抽選
            const drawn = drawAlphabet(false);
            tempInventory[drawn.alphabet] = (tempInventory[drawn.alphabet] || 0) + 1;

            log.push({
                type: 'draw',
                alphabet: drawn.alphabet,
                rarity: drawn.rarity,
                drawCount: tempDrawCount,
                inventory: { ...tempInventory }
            });

            // 上級抽選チェック
            if (Math.random() < advancedProbability / 100) {
                tempAdvancedDrawCount++;
                const advancedDrawn = drawAlphabet(true);
                tempInventory[advancedDrawn.alphabet] = (tempInventory[advancedDrawn.alphabet] || 0) + 1;

                log.push({
                    type: 'advanced_draw',
                    alphabet: advancedDrawn.alphabet,
                    rarity: advancedDrawn.rarity,
                    advancedDrawCount: tempAdvancedDrawCount,
                    inventory: { ...tempInventory }
                });
            }

            // 配置
            const beforePlacement = JSON.stringify(tempPlacement);
            for (let wordIndex = 0; wordIndex < targetWords.length; wordIndex++) {
                if (!selectedWords[wordIndex]) continue; // 選択されていない単語はスキップ

                for (let letterIndex = 0; letterIndex < targetWords[wordIndex].length; letterIndex++) {
                    const targetLetter = targetWords[wordIndex][letterIndex];
                    if (!tempPlacement[wordIndex][letterIndex] && tempInventory[targetLetter] > 0) {
                        tempPlacement[wordIndex][letterIndex] = targetLetter;
                        tempInventory[targetLetter]--;

                        // パウダー必要数の減算
                        let foo = "";
                        if (alphabets.rare.includes(targetLetter)) foo = "rare";
                        else if (alphabets.medium.includes(targetLetter)) foo = "medium";
                        else foo = "common";
                        requiredPowder -= powderCost[foo];
                    }
                }
            }

            if (JSON.stringify(tempPlacement) !== beforePlacement) {
                log.push({
                    type: 'placement',
                    placement: JSON.parse(JSON.stringify(tempPlacement)),
                    inventory: { ...tempInventory }
                });
            }

            // クリア判定
            //const gameComplete = tempPlacement.every((word, index) =>
            //    selectedWords[index] ? word.every(letter => letter !== null) : true
            //);

            // パウダー必要数が所持数未満ならクリア
            const gameComplete = (tempPowder >= requiredPowder); 

            if (gameComplete) {
                log.push({
                    type: 'complete',
                    drawCount: tempDrawCount,
                    advancedDrawCount: tempAdvancedDrawCount,
                    synthesisCount: tempSynthesisCount,
                    powder: tempPowder
                });
                break;
            }

            // 合成判定
            const totalCount = Object.values(tempInventory).reduce((sum, count) => sum + count, 0);
            if (totalCount >= 5) {
                tempSynthesisCount++;

                // 合成実行
                let powderGain = 0;
                let itemsToRemove = 5;
                const itemsUsed = [];

                // アルファベット削除し取得パウダーを計算
                const allLetters = Object.keys(tempInventory);
                for (const letter of allLetters) {
                    while (tempInventory[letter] > 0 && itemsToRemove > 0) {
                        tempInventory[letter]--;
                        if (alphabets.rare.includes(letter)) {
                            powderGain += 255;
                        } else if (alphabets.medium.includes(letter)) {
                            powderGain += 75;
                        } else {
                            powderGain += 5;
                        }
                        itemsToRemove--;
                        itemsUsed.push(letter);
                    }
                }

                // アルファベット獲得
                const synthesized = synthesize();
                tempInventory[synthesized.alphabet] = (tempInventory[synthesized.alphabet] || 0) + 1;
                tempPowder = tempPowder + powderGain;

                log.push({
                    type: 'synthesis',
                    synthesisCount: tempSynthesisCount,
                    itemsUsed,
                    synthesized: synthesized.alphabet,
                    powderGain,
                    totalPowder: tempPowder,
                    inventory: { ...tempInventory }
                });
            }
        }

        setAnimationLog(log);

        // アニメーション開始
        if (log.length > 0) {
            startAnimation(log);
        }
    };

    // アニメーション開始
    const startAnimation = (log) => {
        let index = 0;
        let timeoutId;

        const animate = () => {
            if (index >= log.length) {
                setGameState(refGameState.current = 'completed');
                return;
            }
            if (refGameState.current != 'running') return;

            const logEntry = log[index];

            switch (logEntry.type) {
                case 'draw':
                    setDrawCount(logEntry.drawCount);
                    setInventory(logEntry.inventory);
                    break;
                case 'advanced_draw':
                    setAdvancedDrawCount(logEntry.advancedDrawCount);
                    setInventory(logEntry.inventory);
                    break;
                case 'placement':
                    setCurrentPlacement(logEntry.placement);
                    setInventory(logEntry.inventory);
                    break;
                case 'synthesis':
                    setSynthesisCount(logEntry.synthesisCount);
                    setPowder(logEntry.totalPowder);
                    setInventory(logEntry.inventory);
                    break;
                case 'complete':
                    setGameState(refGameState.current = 'completed');
                    break;
            }

            setCurrentLogIndex(index);
            index++;

            if (index < log.length) {
                timeoutId = setTimeout(animate, refAnimationSpeed.current);
            } else {
                setGameState(refGameState.current = 'completed');
            }
        };

        animate();
    };

    // ストップ機能
    const stopSimulation = () => {
        setGameState(refGameState.current = 'stopped');
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // リセット機能
    const resetSimulation = () => {
        setGameState(refGameState.current = 'stopped');
        setDrawCount(0);
        setAdvancedDrawCount(0);
        setSynthesisCount(0);
        setPowder(0);
        setCurrentPlacement(targetWords.map(word => word.map(() => null)));

        // インベントリを初期化（全て0）
        const initialInventory = {};
        [...alphabets.rare, ...alphabets.medium, ...alphabets.common].forEach(letter => {
            initialInventory[letter] = 0;
        });
        setInventory(initialInventory);

        setAnimationLog([]);
        setCurrentLogIndex(0);
    };

    return (
        <div className="p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 min-h-screen text-white">
            <h6 className="text-right"><a href="https://github.com/roclAknn/Universe-PinkBean-Sim" target="_blank">github</a></h6>
            <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">宇宙スターピンクビーン</h2>
            <h2 className="text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">シミュレーター</h2>
            {/* 設定パネル */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-bold mb-4 text-purple-300">設定</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            アニメーション速度 (ms)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="range"
                                min="1"
                                max="1000"
                                value={animationSpeed}
                                onChange={(e) => setAnimationSpeed(refAnimationSpeed.current = Number(e.target.value))}
                                className="flex-1"
                            />
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={animationSpeed}
                                onChange={(e) => setAnimationSpeed(refAnimationSpeed.current = Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-black/30 border border-white/20 rounded text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            上級箱 (%)<span className="brightness-75"> …通常箱1個あたりの割合</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={advancedProbability}
                                onChange={(e) => setAdvancedProbability(Number(e.target.value))}
                                className="flex-1"
                                disabled={gameState === 'running'}
                            />
                            <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={advancedProbability}
                                onChange={(e) => setAdvancedProbability(Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-black/30 border border-white/20 rounded text-white"
                                disabled={gameState === 'running'}
                            />
                        </div>
                    </div>
                </div>

                {/* 単語選択 */}
                <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">収集する単語を選択</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {wordNames.map((wordName, index) => (
                            <label key={index} className="flex items-center space-x-2 bg-black/20 p-2 rounded">
                                <input
                                    type="checkbox"
                                    checked={selectedWords[index]}
                                    onChange={(e) => {
                                        const newSelected = [...selectedWords];
                                        newSelected[index] = e.target.checked;
                                        setSelectedWords(newSelected);
                                    }}
                                    disabled={gameState === 'running'}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">{wordName}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* コントロールボタン */}
            <div className="flex justify-center space-x-4 mb-6">
                <button
                    onClick={runSimulation}
                    disabled={gameState === 'running'}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-200"
                >
                    シミュレーション開始
                </button>
                <button
                    onClick={stopSimulation}
                    disabled={gameState !== 'running'}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-500 px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-200"
                >
                    停止
                </button>
                <button
                    onClick={resetSimulation}
                    className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 px-6 py-3 rounded-lg font-bold shadow-lg transition-all duration-200"
                >
                    リセット
                </button>
            </div>

            {/* 結果表示 */}
            {gameState === 'completed' && (
                <div className="bg-gradient-to-r from-green-600/80 to-emerald-600/80 backdrop-blur-sm border border-green-400/30 rounded-lg p-4 mb-6">
                    <h2 className="text-xl font-bold mb-2">コンプリート！</h2>
                    <p className="text-lg">
                        {drawCount}箱でクリアしました！
                    </p>
                    <p className="text-sm mt-2">
                        上級箱: {advancedDrawCount}回 | 合成: {synthesisCount}回 | パウダー: {powder.toLocaleString()}
                    </p>
                </div>
            )}
            <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-bold mb-4 text-purple-300">統計</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-purple-600/50 backdrop-blur-sm border border-purple-400/30 rounded p-3">
                        <div className="text-2xl font-bold text-purple-200">{drawCount}</div>
                        <div className="text-sm text-purple-300">通常箱</div>
                    </div>
                    <div className="bg-pink-600/50 backdrop-blur-sm border border-pink-400/30 rounded p-3">
                        <div className="text-2xl font-bold text-pink-200">{advancedDrawCount}</div>
                        <div className="text-sm text-pink-300">上級箱</div>
                    </div>
                    <div className="bg-yellow-600/50 backdrop-blur-sm border border-yellow-400/30 rounded p-3">
                        <div className="text-2xl font-bold text-yellow-200">{synthesisCount}</div>
                        <div className="text-sm text-yellow-300">合成回数</div>
                    </div>
                    <div className="bg-indigo-600/50 backdrop-blur-sm border border-indigo-400/30 rounded p-3">
                        <div className="text-2xl font-bold text-indigo-200">{powder.toLocaleString()}</div>
                        <div className="text-sm text-indigo-300">パウダー</div>
                    </div>
                </div>
            </div>

            {/* ゲームボード */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-bold mb-4 text-purple-300">ゲームボード</h2>
                <div className="space-y-4 text-center">
                    {currentPlacement.map((word, wordIndex) => (
                        <div key={wordIndex} className={` mx-auto w-[calc(8*42px)] grid justify-center gap-2 grid-cols-8`}>
                            {word.map((letter, letterIndex) => {
                                const targetLetter = targetWords[wordIndex][letterIndex];
                                return (
                                    <div
                                        key={letterIndex}
                                        className={`w-10 h-12 border-2 rounded flex items-center justify-center text-xl font-bold transition-all duration-300 
                                        ${getRarityColor(targetLetter)} text-white shadow-lg 
                                        ${letter ? "" : "brightness-50"}`}
                                    >
                                        {letter || targetLetter}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* インベントリ */}
            <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-6">
                <h2 className="text-xl font-bold mb-4 text-purple-300">所持アルファベット</h2>
                <div className="grid gap-2 justify-center grid-cols-[repeat(auto-fit,50px)]">
                    {Object.entries(inventory).map(([letter, count]) => (
                        <div key={letter} className={`
                        ${getRarityColor(letter)} w-12 h-18 border-2 rounded p-2 text-center text-white shadow-lg
                        ${count > 0 ? "" : "brightness-50"}
                        `}>
                            <div className="text-lg font-bold">{letter}</div>
                            <div className="text-sm">×{count}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AlphabetGameSimulator />);
