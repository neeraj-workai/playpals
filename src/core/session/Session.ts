// Active game session — tracks which players are in the current match so
// ResultOverlay can record wins without game scenes needing player IDs.
export const Session = {
  player1Id: 'main',
  player2Id: '',
  gameKey: '',

  setGame(gameKey: string, p1Id: string, p2Id = ''): void {
    this.gameKey = gameKey;
    this.player1Id = p1Id;
    this.player2Id = p2Id;
  },
};
