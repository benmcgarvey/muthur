import chessGameService, {
  ChessGame,
  fenToGif,
  nextTurn,
  relativeScore,
  sanToLan,
  squareInCheck,
} from 'store/services/chessGameService';
import { assert, Message } from 'utils';
import { resolveOpponent } from './play';

export default {
  handle: async ({ say, context }: Message) => {
    try {
      const move = context.matches?.[2] || 'NULL';
      const opponent = resolveOpponent(context.matches?.[1] || 'NULL');

      assert(context.user);

      const existingGame: ChessGame | undefined = chessGameService.findWhere(
        `id CONTAINS "${context.user.id} vs ${opponent.id}" || id CONTAINS "${opponent.id} vs ${context.user.id}"`
      )[0];

      if (!existingGame) {
        await say(
          'No game found - try challenging someone with `chess play @opponent`'
        );
        return;
      }

      const { game } = existingGame;

      if (nextTurn(existingGame) !== context.user.id) {
        await say("It's not your turn!");
        return;
      }

      const result = game.move(move);

      if (result) {
        let check: string | undefined;

        // checkmate
        if (game.in_checkmate()) {
          // you win!
          check = squareInCheck(game);
          chessGameService.update(existingGame.id, { gameFen: game.fen() });
          await say('You win!');
          await say(
            fenToGif(game.fen(), {
              lastMove: sanToLan(result),
              flipBoard: game.turn() === 'b',
              check,
            })
          );
          return;
        }

        // stalemate
        // draw
        // threefold repetition
        // insufficient material
        if (game.game_over()) {
          // draw
          chessGameService.update(existingGame.id, { gameFen: game.fen() });
          await say('Draw!');
          await say(
            fenToGif(game.fen(), {
              lastMove: sanToLan(result),
              flipBoard: game.turn() === 'b',
            })
          );
          return;
        }

        if (game.in_check()) {
          // check
          check = squareInCheck(game);
          chessGameService.update(existingGame.id, { gameFen: game.fen() });
          await say(
            `Check - ${nextTurn(
              existingGame
            )} it's your turn! Score: ${relativeScore(game)}`
          );
          await say(
            fenToGif(game.fen(), {
              lastMove: sanToLan(result),
              flipBoard: game.turn() === 'b',
              check,
            })
          );
          return;
        }

        chessGameService.update(existingGame.id, { gameFen: game.fen() });
        await say(
          `${nextTurn(existingGame)} your turn! Score: ${relativeScore(game)}`
        );
        await say(
          fenToGif(game.fen(), {
            lastMove: sanToLan(result),
            flipBoard: game.turn() === 'b',
            check,
          })
        );
        return;
      }

      await say('Invalid move');
    } catch (e) {
      await say(e.message);
      return;
    }
  },
};
