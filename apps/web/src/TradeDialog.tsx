import { useState } from 'react';
import { RESOURCES, RESOURCE_LABELS, type Resource } from '@hextutor/shared';
import { applyCommand, tradeRatio, type GameState, type GameCommand } from '@hextutor/game-engine';
import { Modal } from './Modal';
import { Icon } from './Icon';
export function TradeDialog({
  state,
  onCommand,
  onClose,
}: {
  state: GameState;
  onCommand: (c: GameCommand) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState('bank'),
    [give, setGive] = useState<Resource>('wood'),
    [receive, setReceive] = useState<Resource>('ore'),
    [giveAmount, setGiveAmount] = useState(1),
    [receiveAmount, setReceiveAmount] = useState(1);
  const playerId = state.activePlayerId,
    ratio = tradeRatio(state, playerId, give);
  const command: GameCommand =
    target === 'bank'
      ? { type: 'bankTrade', playerId, give, receive }
      : { type: 'proposeTrade', playerId, to: target, give, receive, giveAmount, receiveAmount };
  const result = applyCommand(state, command);
  return (
    <Modal title="Make a trade" onClose={onClose}>
      <p className="muted">
        Ports improve your bank rate. Player offers need the other player’s acceptance.
      </p>
      <label className="field">
        Trade with
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="bank">The bank</option>
          {state.order
            .filter((id) => id !== playerId)
            .map((id) => (
              <option key={id} value={id}>
                {state.players[id].name}
              </option>
            ))}
        </select>
      </label>
      <div className="trade-fields">
        <label className="field">
          You give
          <select value={give} onChange={(e) => setGive(e.target.value as Resource)}>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {RESOURCE_LABELS[r]} ({state.players[playerId].resources[r]} held)
              </option>
            ))}
          </select>
          {target === 'bank' ? (
            <span className="trade-amount">{ratio} cards</span>
          ) : (
            <input
              aria-label="Amount to give"
              type="number"
              min="1"
              max="19"
              value={giveAmount}
              onChange={(e) => setGiveAmount(Number(e.target.value))}
            />
          )}
        </label>
        <Icon name="trade" />
        <label className="field">
          You receive
          <select value={receive} onChange={(e) => setReceive(e.target.value as Resource)}>
            {RESOURCES.map((r) => (
              <option key={r} value={r}>
                {RESOURCE_LABELS[r]} (
                {target === 'bank' ? state.bank[r] : state.players[target].resources[r]} available)
              </option>
            ))}
          </select>
          {target === 'bank' ? (
            <span className="trade-amount">1 card</span>
          ) : (
            <input
              aria-label="Amount to receive"
              type="number"
              min="1"
              max="19"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(Number(e.target.value))}
            />
          )}
        </label>
      </div>
      {!result.ok && <p className="validation-note">{result.error}</p>}
      <button
        className="primary full"
        disabled={!result.ok}
        onClick={() => {
          onCommand(command);
          onClose();
        }}
      >
        {target === 'bank' ? `Exchange ${ratio}:1` : 'Offer trade'}
        <Icon name="arrow" size={17} />
      </button>
    </Modal>
  );
}
