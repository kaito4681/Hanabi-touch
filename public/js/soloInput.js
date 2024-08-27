/**
 * サーバに入力された文字を送信
 * @param {string} key 一文字
 */
async function sendChar(key) {
  const response = await fetch(
    '/solo/sendCharacter',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alphabet: key }),
    },
  );

  const responseObj = await response.json();

  // ステータスコードが200でなければエラーハンドリング
  if (response.status !== 200) {
    console.error('Error:', responseObj.message || 'Unknown error');
    deleteCookie();
    location.reload();
    return;
  }

  if (responseObj.isCorrect) { //正しい入力ならば
    // 打った文字の色の更新
    update(key);

    const shape = random(['菊', '牡丹']);
    new Firework(
      [
        color(random(255), 255, 255),
        color(random(255), 255, 255),
        color(random(255), 255, 255),
      ],
      [shape, shape, shape],
      graphicBuffers,
      launchPos = createVector(
        random(width * 0.1, width * 0.9),
        height,
      ), // launchPos
      0.5, //  speedMultiplier
      0.5, // lifespanMultiplier
    ).push();
    fireworkHugh.play();
    setTimeout(() => {
      fireworkBoom.play();
    }, 1450);
  } else { // 間違った入力ならば
    miss.play(); // 音声の再生
    return;
  }

  // 得点の更新
  updateScore(responseObj.score);
  // メーターの更新
  syncMeter(responseObj.meter);

  // 最後の文字ならば
  if (responseObj.isCompleted) {
	await fetchSentenceAndRefreshMeter();

    const size = responseObj.fireworkSize / 10;
    new Firework(
      [
        color(random(255), 255, 255),
        color(random(255), 255, 255),
        color(random(255), 255, 255),
      ],
      [random(['菊', '牡丹']), random(['菊', '牡丹']), random(['菊', '牡丹'])],
      graphicBuffers,
      launchPos = createVector(
        width * 0.5,
        height,
      ), // launchPos
      size, //  speedMultiplier
      size, // lifespanMultiplier
      size,
    ).push();
    fireworkHugh.play();
    setTimeout(() => {
      fireworkBoom.play();
    }, 1450);
  }
}

/**
 * 入力した文字の更新（idがnotEnteredの文字をidがenteredの要素に移動）
 * @param {string} key 一文字
 */
function update(key) {
  const entered = document.getElementById('entered');
  const notEntered = document.getElementById('notEntered');

  // notEnteredの最初の一文字を取得
  const firstChar = notEntered.textContent.charAt(0);

  if (key === firstChar) {
    // notEnteredから最初の一文字を削除
    notEntered.textContent = notEntered.textContent.slice(1);

    // enteredの最後にその一文字を追加
    entered.textContent += firstChar;
  }
}

// 入力された文字をサーバーを送る
function startObserve() {
  document.addEventListener('keydown', (event) => {
    if (
      event.key.length === 1 &&
      ((event.key >= 'a' && event.key <= 'z') ||
        (event.key >= 'A' && event.key <= 'Z') ||
        event.key === '-')
    ) {
      sendChar(event.key);
    }
  });
}
