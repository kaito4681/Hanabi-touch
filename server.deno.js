import { serveDir } from 'https://deno.land/std@0.151.0/http/file_server.ts';
import { getCookies } from 'https://deno.land/std@0.74.0/http/mod.ts';
import { UserGame } from './model/UserGame.js';

function makeId() {
  return crypto.randomUUID();
}

// 「日本語文章,アルファベット」
// 形式のcsvファイルを読み込む
const themeSentencesText = await Deno.readTextFile('./private/sentences.csv');
// 改行とカンマ区切りで2次元リスト化
const themeSentences = themeSentencesText.split('\n').map((text) => {
  text = text.replaceAll('\r', '');
  return text.split(',');
});

/**
 * ランダムな文章とそのローマ字文章の組み合わせを出力
 * @returns [日本語文章, ローマ字文章]
 */
function getRandomThemeSentence() {
  return themeSentences[Math.floor(Math.random() * themeSentences.length)];
}

/**
 * エラーレスポンス生成
 * @param {String} errorMessage bodyのerrorMessageに載せる文字列
 * @param {String} errorCode bodyのerrorCodeに載せる文字列
 * @returns 400番のエラーレスポンス
 */
function makeErrorResponse(errorMessage, errorCode) {
  return new Response(
    JSON.stringify({
      'errorMessage': errorMessage,
      'errorCode': errorCode,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
}

/**
 * 200番レスポンスを生成
 * @param {JSON} bodyJson bodyに入れる辞書型
 * @returns 200番のレスポンス
 */
function make200Response(bodyJson) {
  return new Response(
    JSON.stringify(bodyJson),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  );
}

// idをキーにuserGameのインスタンスを保持する辞書型
const userGames = {};

Deno.serve(async (req) => {
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  // ユーザidをcookieに設定する
  if (req.method === 'GET' && pathname === '/getId') {
    if (getCookies(req)['id']) return new Response('id is already set');
    return new Response(
      'set id',
      {
        status: 200,
        headers: {
          'set-cookie': `id=${makeId()}`,
        },
      },
    );
  }

  // ゲームスタートと同時に初期化
  if (req.method === 'GET' && pathname === '/solo/start') {
    if (!getCookies(req)['id']) {
      return makeErrorResponse('id in cookies is not set', '10001');
    }
    const id = getCookies(req)['id'];
    userGames[id] = new UserGame(id);
    return make200Response({
      'endTime': userGames[id].getEndTime(),
      'initializedScore': userGames[id].getInitializedScore(),
    });
  }

  // cookieのidからユーザごとに文章を取得する
  if (req.method === 'GET' && pathname === '/solo/getSentence') {
    const targetSentence = getRandomThemeSentence();
    if (!getCookies(req)['id']) {
      return makeErrorResponse('id in cookies is not set', '10001');
    }
    const id = getCookies(req)['id'];
    if (!userGames[id]) {
      return makeErrorResponse('UserGame insntance is not made', '10003');
    }
    userGames[id].setSentenceNow(targetSentence[0], targetSentence[1]);
    return make200Response({
      'sentenceJapanese': targetSentence[0],
      'sentenceAlphabet': targetSentence[1],
      'expectedTime': userGames[id].calcExpectedTime(),
    });
  }

  // 1文字ごとに正誤判定を行う
  if (req.method === 'POST' && pathname === '/solo/sendCharacter') {
    if (!getCookies(req)['id']) {
      return makeErrorResponse('id in cookies is not set', '10001');
    }
    const id = getCookies(req)['id'];
    if (!userGames[id]) {
      return makeErrorResponse('UserGame insntance is not made', '10003');
    }
    if (userGames[id].isCompleted()) {
      return makeErrorResponse('sentence is not set', '10002');
    }
    const reqeustJson = await req.json();
    const sentChar = reqeustJson['alphabet'];
    const isCorrect = userGames[id].judgeAndCalcScore(sentChar);
    return make200Response({
      'isCorrect': isCorrect,
      'isCompleted': userGames[id].isCompleted(),
      'score': userGames[id].getTotalScore(),
      'meter': userGames[id].getMeter(),
      'fireworkSize': userGames[id].calcFireworkSize(),
    });
  }

  if (req.method === 'GET' && pathname === '/solo/getResult') {
    if (!getCookies(req)['id']) {
      return makeErrorResponse('id in cookies is not set', '10001');
    }
    const id = getCookies(req)['id'];
    if (!userGames[id]) {
      return makeErrorResponse('UserGame insntance is not made', '10003');
    }
    return make200Response({
      'score': userGames[id].getTotalScore(),
      'fireworkCount': userGames[id].calcTotalFireworks(),
      'typesPerSecond': userGames[id].calcTypesPerSecond(),
      'typeCount': userGames[id].getTotalCorrectTypeCount(),
    });
  }

  return serveDir(req, {
    fsRoot: 'public',
    urlRoot: '',
    showDirListing: true,
    enableCors: true,
  });
});
