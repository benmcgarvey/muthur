import { Chess, ChessInstance, Move } from 'chess.js';
import shortUUID from 'short-uuid';
import realmInstance from 'store/realm';
import querystring from 'querystring';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface DBChessGame {
  id: string;
  black: string;
  white: string;
  gameFen: string;
}

export interface ChessGame {
  id: string;
  black: string;
  white: string;
  game: ChessInstance;
}

const transformDBInstanceToAppInstance: (
  dBChessGame: DBChessGame & Realm.Object
) => ChessGame = ({ gameFen, id, black, white }) => ({
  game: new Chess(gameFen),
  id,
  black,
  white,
});

export const sanToLan = ({ from, to }: Move) => `${from}${to}`;

export const fenToGif = (
  fen: string,
  options?: { flipBoard?: boolean; lastMove?: string; check?: string }
) => {
  const [fenBoardState] = fen.split(' ');

  const queryParams = {
    fen: fenBoardState,
    ...(options?.flipBoard ? { orientation: 'black' } : undefined),
    ...(options?.lastMove ? { lastMove: options.lastMove } : undefined),
    ...(options?.check ? { check: options.check } : undefined),
  };

  return `https://lila-gif.fly.dev/image.gif?${querystring.stringify(
    queryParams,
    undefined,
    undefined,
    { encodeURIComponent: (string: string) => string }
  )}#${shortUUID.generate()}`;
};

export const nextTurn = (game: ChessGame) =>
  game.game.turn() === 'b' ? game.black : game.white;

export const opposition = (currentUser: string, game: ChessGame) =>
  game.white === currentUser ? game.black : game.white;

export const squareInCheck = (game: ChessInstance) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const gameBoard = game.board();

  for (let rank = 0; rank < gameBoard.length; rank++) {
    for (let file = 0; file < gameBoard[rank].length; file++) {
      const square = gameBoard[rank][file];
      if (square && square.type === game.KING && square.color === game.turn()) {
        return `${files[file]}${8 - rank}`;
      }
    }
  }
};

export const relativeScore = (game: ChessInstance) => {
  const pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };

  const fen = game.fen().split(' ')[0].split('');
  const black = fen
    .filter((character) => character.match(/[a-z]/g))
    .reduce((acc, curr) => acc + pieceValues[curr], 0);

  const white = fen
    .filter((character) => character.match(/[A-Z]/g))
    .map((piece) => piece.toLowerCase())
    .reduce((acc, curr) => acc + pieceValues[curr], 0);

  const whiteDiff = white - black;
  const blackDiff = black - white;

  if (white === black) {
    return 'White: 0, Black 0';
  }

  return whiteDiff > blackDiff
    ? `White: +${whiteDiff}`
    : `Black: +${blackDiff}`;
};

const find = (id: string) => {
  const instance = realmInstance.objectForPrimaryKey<DBChessGame>(
    'ChessGame',
    id
  );

  return instance ? transformDBInstanceToAppInstance(instance) : undefined;
};

const create = (
  id: string,
  { white, black }: { white: string; black: string }
) => {
  let newInstance: (DBChessGame & Realm.Object) | undefined;

  realmInstance.write(() => {
    newInstance = realmInstance.create<DBChessGame>('ChessGame', {
      id,
      black,
      white,
      gameFen: STARTING_FEN,
    });
  });

  return newInstance
    ? transformDBInstanceToAppInstance(newInstance)
    : undefined;
};

const update = (
  id: string,
  data?: { white?: string; black?: string; gameFen?: string }
) => {
  let newInstance: (DBChessGame & Realm.Object) | undefined;

  realmInstance.write(() => {
    newInstance = realmInstance.create<DBChessGame>(
      'ChessGame',
      {
        id,
        ...data,
      },
      Realm.UpdateMode.Modified
    );
  });

  return newInstance
    ? transformDBInstanceToAppInstance(newInstance)
    : undefined;
};

const findOrCreate = (id: string, data: { white: string; black: string }) =>
  find(id) ?? create(id, data)!;

const all = () =>
  realmInstance
    .objects<DBChessGame>('ChessGame')
    .map(transformDBInstanceToAppInstance);

const findWhere = (predicate: string) =>
  realmInstance
    .objects<DBChessGame>('ChessGame')
    .filtered(predicate)
    .map(transformDBInstanceToAppInstance);

export default {
  find,
  create,
  update,
  findOrCreate,
  all,
  findWhere,
};
