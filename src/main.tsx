import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  Trophy,
  Monitor,
  Settings2,
  X,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Crown,
  Pause,
  Play,
  Plus,
  RotateCcw,
  History,
  LogOut,
  Wifi,
  WifiOff,
  ChevronDown,
  BookOpen,
  Flag,
  Menu,
  Coins,
  Sparkles,
} from 'lucide-react';
import {
  type PublicRoom,
  type Game,
  type Card,
  type Settings,
  type Option,
  GAMES,
  AVATARS,
  DUCKS,
  RED,
  WHEEL,
  money,
  cardLabel,
  handValue,
  optionsFor,
} from '../shared/model';
import './style.css';

async function api(path: string, body?: unknown, token?: string) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка соединения');
  return data;
}
function Pig({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M13 25 10 7l19 12M51 25 54 7 35 19" fill="currentColor" />
      <ellipse cx="32" cy="35" rx="27" ry="23" fill="currentColor" />
      <ellipse cx="32" cy="40" rx="15" ry="10" fill="#102d27" />
      <ellipse cx="27" cy="40" rx="2.5" ry="4" fill="currentColor" />
      <ellipse cx="37" cy="40" rx="2.5" ry="4" fill="currentColor" />
      <circle cx="21" cy="28" r="2" fill="#102d27" />
      <circle cx="43" cy="28" r="2" fill="#102d27" />
      <path d="m23 10 3-8 6 6 6-6 3 8" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
function Brand() {
  return (
    <a className="brand" href="/" aria-label="Михрюказино — главная">
      <span className="brand-icon">
        <Pig />
      </span>
      <span>
        михрю<span className="brand-light">казино</span>
        <small>PRIVATE CLUB · EST. 2026</small>
      </span>
    </a>
  );
}
function Wheel({
  spinning = false,
  number,
  large = false,
}: {
  spinning?: boolean;
  number?: number;
  large?: boolean;
}) {
  const step = 360 / 37;
  return (
    <div className={`wheel-wrap ${large ? 'large' : ''}`}>
      <div className="wheel-pointer" />
      <div
        className={`wheel-disc ${spinning ? 'spinning' : ''}`}
        style={
          !spinning && number !== undefined
            ? { transform: `rotate(${-WHEEL.indexOf(number) * step}deg)` }
            : undefined
        }
      >
        <svg viewBox="0 0 400 400" role="img" aria-label="Европейская рулетка">
          <defs>
            <radialGradient id="wood">
              <stop stopColor="#36564a" />
              <stop offset=".75" stopColor="#0d2a23" />
              <stop offset="1" stopColor="#071b16" />
            </radialGradient>
            <radialGradient id="gold">
              <stop stopColor="#f8e1a4" />
              <stop offset=".5" stopColor="#bd9350" />
              <stop offset="1" stopColor="#725025" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="198" fill="url(#gold)" />
          <circle cx="200" cy="200" r="187" fill="#141d18" />
          {WHEEL.map((n, i) => {
            const a = ((i * step - step / 2 - 90) * Math.PI) / 180,
              b = ((i * step + step / 2 - 90) * Math.PI) / 180;
            return (
              <g key={n}>
                <path
                  d={`M ${200 + 142 * Math.cos(a)} ${200 + 142 * Math.sin(a)} L ${200 + 181 * Math.cos(a)} ${200 + 181 * Math.sin(a)} A 181 181 0 0 1 ${200 + 181 * Math.cos(b)} ${200 + 181 * Math.sin(b)} L ${200 + 142 * Math.cos(b)} ${200 + 142 * Math.sin(b)} A 142 142 0 0 0 ${200 + 142 * Math.cos(a)} ${200 + 142 * Math.sin(a)}`}
                  fill={n === 0 ? '#36846b' : RED.includes(n) ? '#9d3441' : '#15231e'}
                  stroke="#c4a36c"
                  strokeWidth=".7"
                />
                <text
                  x="200"
                  y="38"
                  fill="#f4e8cc"
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="sans-serif"
                  transform={`rotate(${i * step} 200 200)`}
                >
                  {n}
                </text>
                <path
                  d={`M ${200 + 65 * Math.cos(a)} ${200 + 65 * Math.sin(a)} L ${200 + 141 * Math.cos(a)} ${200 + 141 * Math.sin(a)}`}
                  stroke="#a78248"
                  strokeWidth="1"
                />
              </g>
            );
          })}
          <circle cx="200" cy="200" r="140" fill="url(#wood)" stroke="#ae8a4b" strokeWidth="3" />
          <circle cx="200" cy="200" r="110" fill="none" stroke="#bba16c" strokeOpacity=".3" />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M200 73 200 136"
              stroke="#8e7546"
              strokeWidth="1"
              transform={`rotate(${i * 30} 200 200)`}
            />
          ))}
          <circle cx="200" cy="200" r="62" fill="url(#gold)" />
          <circle cx="200" cy="200" r="49" fill="#183c30" stroke="#ebcf85" />
          <path
            d="M200 163v74M163 200h74"
            stroke="url(#gold)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <circle cx="200" cy="200" r="16" fill="url(#gold)" />
        </svg>
      </div>
      <span className="wheel-ball" />
    </div>
  );
}
function CardView({ card }: { card: Card | null }) {
  return (
    <div className={`card ${card === null ? 'back' : card.suit % 2 === 1 ? 'red' : ''}`}>
      {card ? (
        <>
          <span>{cardLabel(card)}</span>
          <b>{['♠', '♥', '♣', '♦'][card.suit]}</b>
          <span>{cardLabel(card)}</span>
        </>
      ) : (
        <Pig size={27} />
      )}
    </div>
  );
}
function useClock(offset: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return now + offset;
}
function App() {
  const initial = () => {
    const f = new URLSearchParams(location.hash.slice(1)),
      t = f.get('watch') || f.get('recover');
    if (t) {
      if (f.has('watch')) sessionStorage.setItem('mihryu-tab', t);
      else {
        sessionStorage.removeItem('mihryu-tab');
        localStorage.setItem('mihryu-session', t);
      }
      history.replaceState(null, '', location.pathname + location.search);
    }
    return sessionStorage.getItem('mihryu-tab') || localStorage.getItem('mihryu-session') || '';
  };
  const [token, setToken] = useState(initial),
    [room, setRoom] = useState<PublicRoom | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(''),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false),
    [muted, setMuted] = useState(() => localStorage.getItem('mihryu-muted') !== 'false'),
    [offset, setOffset] = useState(0),
    [nav, setNav] = useState(false);
  const now = useClock(offset),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    version = useRef(-1),
    lastResult = useRef('');
  function notify(message: string) {
    setError(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setError(''), 5000);
  }
  function update(r: PublicRoom) {
    if (r.version < version.current) return;
    version.current = r.version;
    setOffset(r.now - Date.now());
    setRoom(r);
  }
  useEffect(() => {
    function acceptLink() {
      if (!location.hash) return;
      const next = initial();
      if (next !== token) {
        setRoom(null);
        setToken(next);
      }
    }
    window.addEventListener('hashchange', acceptLink);
    return () => window.removeEventListener('hashchange', acceptLink);
  }, [token]);
  useEffect(() => {
    if (!token) return;
    version.current = -1;
    api('/api/session', undefined, token)
      .then(update)
      .catch((e) => {
        notify(e.message);
        setRoom(null);
        setToken('');
        if (sessionStorage.getItem('mihryu-tab')) sessionStorage.removeItem('mihryu-tab');
        else localStorage.removeItem('mihryu-session');
      });
    const socket = io({ auth: { token } });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('state', update);
    return () => {
      socket.disconnect();
    };
  }, [token]);
  useEffect(() => {
    if (room?.phase === 'result' && room.round?.id !== lastResult.current) {
      lastResult.current = room.round?.id || '';
      if (!muted)
        try {
          const ctx = new AudioContext();
          [523, 659, 784].forEach((f, i) => {
            const osc = ctx.createOscillator(),
              g = ctx.createGain();
            osc.connect(g);
            g.connect(ctx.destination);
            osc.frequency.value = f;
            g.gain.setValueAtTime(0.045, ctx.currentTime + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.4);
          });
          setTimeout(() => ctx.close(), 1100);
        } catch {}
    }
  }, [room?.phase, room?.round?.id, muted]);
  function login(t: string) {
    sessionStorage.removeItem('mihryu-tab');
    localStorage.setItem('mihryu-session', t);
    setToken(t);
  }
  async function action(type: string, payload: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api(
        '/api/action',
        {
          type,
          requestId: Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
            b.toString(16).padStart(2, '0'),
          ).join(''),
          roundId: room?.round?.id,
          ...payload,
        },
        token,
      );
      update(data.state);
      return data;
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    if (!confirm('Выйти с этого устройства? Место за столом сохранится.')) return;
    sessionStorage.removeItem('mihryu-tab');
    localStorage.removeItem('mihryu-session');
    setToken('');
    setRoom(null);
    history.replaceState(null, '', '/');
  }
  if (!room)
    return (
      <>
        <Landing login={login} notify={notify} loading={!!token} />
        {error && (
          <div className="toast" role="alert">
            {error}
            <button onClick={() => setError('')} aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        )}
      </>
    );
  const self = room.players.find((p) => p.id === room.selfId),
    isHost = room.role === 'host',
    spectator = room.role === 'spectator',
    rd = room.round;
  const seconds = Math.max(0, Math.ceil(((rd?.deadline || now) - now) / 1000));
  return (
    <div className={`app ${spectator ? 'spectator' : ''}`}>
      <header className="topbar">
        <Brand />
        <div className="room-identity">
          <span className="live-dot" /> {room.title}
          <span className="code-badge">#{room.code}</span>
        </div>
        <div className="top-actions">
          <span
            className={`connection ${connected ? '' : 'offline'}`}
            title={connected ? 'На связи' : 'Переподключение'}
          >
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{connected ? 'На связи' : 'Соединяем…'}</span>
          </span>
          <button
            className="icon-button"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            onClick={() => {
              setMuted(!muted);
              localStorage.setItem('mihryu-muted', String(!muted));
            }}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label="Меню"
            onClick={() => setNav(!nav)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${nav ? 'visible' : ''}`}>
          <div className="side-label">ВАШ ОБЩИЙ СТОЛ</div>
          <nav>
            {(Object.keys(GAMES) as Game[]).map((game, i) => (
              <button
                key={game}
                className={`game-nav ${room.game === game ? 'active' : ''}`}
                disabled={!isHost || !['lobby', 'result'].includes(room.phase) || busy}
                onClick={() => {
                  action('game', { game });
                  setNav(false);
                }}
              >
                <span className="game-symbol">{GAMES[game].icon}</span>
                <span>
                  {GAMES[game].name}
                  <small>
                    {
                      [
                        'Европейская · 0–36',
                        '6 колод · выплата 3:2',
                        'Punto Banco',
                        'Честные выплаты',
                        'Четыре характера',
                      ][i]
                    }
                  </small>
                </span>
                {room.game === game && <span className="active-mark" />}
              </button>
            ))}
          </nav>
          <div className="side-bottom">
            <div className="private-note">
              <Pig size={25} />
              <p>
                Своя компания.
                <br />
                Большая игра.
              </p>
            </div>
            <button className="side-link" onClick={() => setModal('invite')}>
              <Users size={18} /> Пригласить друзей
              <ArrowUpRight size={15} />
            </button>
            <button className="side-link" onClick={() => setModal('history')}>
              <History size={18} /> История вечера
            </button>
            {isHost && (
              <button className="side-link" onClick={() => setModal('admin')}>
                <Settings2 size={18} /> Пульт ведущего
              </button>
            )}
            <button className="side-link dim" onClick={logout}>
              <LogOut size={17} /> Выйти
            </button>
          </div>
        </aside>
        <main className="main-table">
          <div className="table-heading">
            <div>
              <div className="eyebrow">
                МИХРЮКАЗИНО <span> / </span> РАУНД {room.roundNumber || '—'}
              </div>
              <h1>
                {room.phase === 'ended' ? 'Вот это был вечер!' : GAMES[room.game].name}
                <span className="heading-suit">{GAMES[room.game].icon}</span>
              </h1>
            </div>
            <button className="subtle-button" onClick={() => setModal('rules')}>
              <BookOpen size={17} />
              <span>Как играть</span>
            </button>
          </div>
          <div className={`phase-bar ${room.phase === 'betting' ? 'accepting' : ''}`}>
            <span className="phase-dot" />
            <strong>
              {room.phase === 'lobby'
                ? 'Собираемся за столом'
                : room.phase === 'betting'
                  ? 'Ставки открыты'
                  : room.phase === 'playing'
                    ? 'Игра идёт'
                    : room.phase === 'ended'
                      ? 'Вечер завершён'
                      : 'Ставки рассчитаны'}
            </strong>
            <span className="phase-detail">
              {room.phase === 'betting'
                ? `${seconds} сек на удачу`
                : room.phase === 'playing' && room.game === 'blackjack'
                  ? 'Ваш ход — на телефоне'
                  : room.phase === 'result' && room.settings.auto && !room.paused
                    ? `Следующий раунд через ${seconds} сек`
                    : room.paused
                      ? 'Пауза после раунда'
                      : room.phase === 'lobby'
                        ? 'Ведущий скоро откроет ставки'
                        : 'Один стол. Одна компания.'}
            </span>
            {room.phase === 'betting' && (
              <div className="timer-track">
                <i
                  style={{ width: `${Math.min(100, (seconds / room.settings.betSeconds) * 100)}%` }}
                />
              </div>
            )}
          </div>
          {room.phase === 'ended' ? (
            <FinalBoard room={room} />
          ) : (
            <GameTable room={room} now={now} onInvite={() => setModal('invite')} />
          )}
          {isHost && room.phase !== 'ended' && (
            <div className="host-strip">
              <span>
                <Crown size={16} /> Вы ведёте этот вечер
              </span>
              <div>
                <button
                  className="subtle-button"
                  disabled={busy}
                  onClick={() => action('pause', { paused: !room.paused })}
                >
                  {room.paused ? <Play size={15} /> : <Pause size={15} />}{' '}
                  {room.paused ? 'Продолжить' : 'Пауза'}
                </button>
                {['lobby', 'result'].includes(room.phase) && (
                  <button
                    className="gold-button small"
                    disabled={busy || room.paused}
                    onClick={() => action('open')}
                  >
                    <Play size={15} /> Открыть ставки
                  </button>
                )}
                {room.phase === 'betting' && (
                  <button
                    className="gold-button small"
                    disabled={busy}
                    onClick={() => action('close')}
                  >
                    <Flag size={15} /> {room.game === 'ducks' ? 'Начать заплыв' : 'Закрыть ставки'}
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label="Пульт ведущего"
                  onClick={() => setModal('admin')}
                >
                  <Settings2 size={18} />
                </button>
              </div>
            </div>
          )}
          {!spectator && self && room.phase !== 'ended' && (
            <BetPanel room={room} self={self} action={action} busy={busy} now={now} />
          )}
          {spectator && (
            <div className="tv-caption">
              <Monitor size={18} /> Общий экран · подключайтесь с телефона{' '}
              <button onClick={() => setModal('invite')}>
                Показать QR-код <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          <div className="table-footer">
            <span>♠ Только виртуальные фишки</span>
            <span>Хорошая компания — главный выигрыш</span>
            <span>♥</span>
          </div>
        </main>
        <aside className="players-panel">
          <div className="panel-heading">
            <h2>{room.phase === 'ended' ? 'Итоги вечера' : 'За столом'}</h2>
            <span>{room.players.length}/10</span>
          </div>
          <Leaderboard room={room} />
          <button className="invite-button" onClick={() => setModal('invite')}>
            <Plus size={17} /> Пригласить друга
          </button>
          <div className="recent">
            <div className="side-label">ПОСЛЕДНИЕ РАУНДЫ</div>
            {room.history.length ? (
              room.history
                .slice(-5)
                .reverse()
                .map((h) => (
                  <div className="recent-row" key={h.number}>
                    <span>
                      {GAMES[h.game].icon} <small>#{h.number}</small>
                    </span>
                    <b>{h.text}</b>
                  </div>
                ))
            ) : (
              <p>
                История начинается
                <br />с вашей первой ставки.
              </p>
            )}
          </div>
          <div className="club-card">
            <span>THE PRIVATE TABLE</span>
            <Pig size={45} />
            <p>
              Вечер, который
              <br />
              захочется повторить.
            </p>
            <small>МИХРЮКАЗИНО</small>
          </div>
        </aside>
      </div>
      {modal && (
        <Modal
          title={
            {
              rules: 'Правила стола',
              invite: 'Свои люди — за один стол',
              admin: 'Пульт ведущего',
              history: 'История вечера',
            }[modal] || ''
          }
          close={() => setModal('')}
        >
          <>
            {modal === 'invite' && (
              <Invite room={room} notify={notify} hostToken={isHost ? token : undefined} />
            )}
            {modal === 'rules' && <Rules game={room.game} />}
            {modal === 'admin' && isHost && (
              <Admin
                room={room}
                action={action}
                busy={busy}
                notify={notify}
                close={() => setModal('')}
              />
            )}
            {modal === 'history' && <LedgerView room={room} />}
          </>
        </Modal>
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
function Landing({
  login,
  notify,
  loading,
}: {
  login: (t: string) => void;
  notify: (s: string) => void;
  loading: boolean;
}) {
  const params = new URLSearchParams(location.search),
    [mode, setMode] = useState(params.has('room') ? 'join' : 'create'),
    [name, setName] = useState(''),
    [title, setTitle] = useState('Вечер у своих'),
    [code, setCode] = useState(params.get('room') || ''),
    [avatar, setAvatar] = useState(AVATARS[0]),
    [pending, setPending] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const data = await api(mode === 'create' ? '/api/rooms' : `/api/rooms/${code}/join`, {
        name,
        title,
        avatar,
      });
      history.replaceState(null, '', `/?room=${data.code}`);
      login(data.token);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="landing">
      <header className="landing-header">
        <Brand />
        <span className="landing-tag">
          <span className="live-dot" /> ВАША КОМПАНИЯ. ВАШЕ КАЗИНО.
        </span>
        <a href="#entry" className="subtle-button">
          Занять место <ArrowUpRight size={17} />
        </a>
      </header>
      <main>
        <div className="landing-hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="short-line" /> ЗАКРЫТЫЙ КЛУБ ДЛЯ СВОИХ
            </div>
            <h1>
              Ставки —<br />
              на <em>хороший</em>
              <br />
              вечер<span className="gold-period">.</span>
            </h1>
            <p>
              Пять игр. Один общий стол.
              <br />
              Соберите друзей, раздайте фишки
              <br />и пусть удача выберет любимчика.
            </p>
            <a href="#entry" className="gold-button">
              Собрать компанию <ArrowRight size={18} />
            </a>
            <div className="hero-note">
              <span>♠</span> Без денег. С азартом. По-настоящему вместе.
            </div>
          </div>
          <div className="hero-art">
            <span className="art-orbit orbit-one" />
            <span className="art-orbit orbit-two" />
            <div className="floating-card card-one">
              <CardView card={{ rank: 1, suit: 0 }} />
            </div>
            <div className="floating-card card-two">
              <CardView card={{ rank: 13, suit: 1 }} />
            </div>
            <Wheel large />
            <div className="hero-chip chip-one">1000</div>
            <div className="hero-chip chip-two">500</div>
            <div className="art-label">
              <span>ОДИН СТОЛ</span>
              <b>Бесконечно много историй</b>
              <i>♥ ♦ ♣ ♠</i>
            </div>
            <div className="tiny-star star-one">✦</div>
            <div className="tiny-star star-two">✧</div>
          </div>
        </div>
        <div className="landing-divider">
          <span>УДАЧА ЛЮБИТ КОМПАНИЮ</span>
          <span>♠</span>
          <span>ТЕЛЕФОН — ВАШ ПРОПУСК ЗА СТОЛ</span>
          <span>♦</span>
          <span>ТЕЛЕВИЗОР — ОБЩИЙ ЭКРАН</span>
        </div>
        <section className="entry-section" id="entry">
          <div className="entry-intro">
            <div className="eyebrow">ВЕЧЕР НАЧИНАЕТСЯ ЗДЕСЬ</div>
            <h2>
              Все свои.
              <br />
              Всё на кону.
            </h2>
            <p>
              Никаких приложений и регистраций.
              <br />
              Откройте комнату, поделитесь QR-кодом —<br />и вы уже за одним столом.
            </p>
            <div className="entry-facts">
              <span>
                <Users size={19} /> До 10 друзей
              </span>
              <span>
                <Monitor size={19} /> Экран для ТВ
              </span>
              <span>
                <Coins size={19} /> 10 000 на старте
              </span>
            </div>
          </div>
          <form className="entry-card" onSubmit={submit}>
            <div className="form-tabs">
              <button
                type="button"
                className={mode === 'create' ? 'selected' : ''}
                onClick={() => setMode('create')}
              >
                Создать вечер
              </button>
              <button
                type="button"
                className={mode === 'join' ? 'selected' : ''}
                onClick={() => setMode('join')}
              >
                Присоединиться
              </button>
            </div>
            <label>
              Как вас представить?
              <input
                required
                maxLength={24}
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {mode === 'create' ? (
              <label>
                Название вечера
                <input
                  required
                  maxLength={48}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            ) : (
              <>
                <label>
                  Код комнаты
                  <input
                    inputMode="numeric"
                    required
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Например, 482913"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <div className="avatar-picker" aria-label="Выберите аватар">
                  {AVATARS.map((a) => (
                    <button
                      type="button"
                      aria-label={`Аватар ${a}`}
                      key={a}
                      className={avatar === a ? 'selected' : ''}
                      onClick={() => setAvatar(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="gold-button full" disabled={pending || loading}>
              {loading
                ? 'Возвращаем вас за стол…'
                : pending
                  ? 'Готовим стол…'
                  : mode === 'create'
                    ? 'Открыть своё казино'
                    : 'Занять место'}
              <ArrowRight size={18} />
            </button>
            <small className="form-note">Только виртуальные фишки. Настоящие эмоции.</small>
          </form>
        </section>
        <section className="games-showcase">
          <div className="eyebrow">СЕГОДНЯ В ПРОГРАММЕ</div>
          <div className="showcase-grid">
            {(Object.keys(GAMES) as Game[]).map((g) => (
              <div className={`showcase-card ${g}`} key={g}>
                <span>{GAMES[g].icon}</span>
                <h3>{GAMES[g].name}</h3>
                <p>{GAMES[g].subtitle}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>Хорошая компания — главный выигрыш.</span>
        <small>Играем на фишки ♥</small>
      </footer>
    </div>
  );
}
function GameTable({
  room,
  now,
  onInvite,
}: {
  room: PublicRoom;
  now: number;
  onInvite: () => void;
}) {
  const rd = room.round,
    o = rd?.outcome,
    result = room.phase === 'result',
    playing = room.phase === 'playing';
  return (
    <div className={`felt-table game-${room.game} ${room.phase === 'lobby' ? 'waiting' : ''}`}>
      <div className="felt-border" />
      <div className="felt-watermark">
        <Pig size={140} />
      </div>
      {room.phase === 'lobby' ? (
        <div className="lobby-content">
          <div className="club-seal">
            <Pig size={65} />
          </div>
          <div className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В КЛУБ</div>
          <h2>Ваш стол готов</h2>
          <p>
            Усаживайтесь поудобнее.
            <br />
            Всё интересное вот-вот начнётся.
          </p>
          <div className="lobby-avatars">
            {room.players.map((p) => (
              <span key={p.id} title={p.name}>
                {p.avatar}
              </span>
            ))}
            {room.players.length < 10 && (
              <button aria-label="Пригласить" onClick={onInvite}>
                <Plus size={21} />
              </button>
            )}
          </div>
          <span className="felt-caption">
            {room.players.length}{' '}
            {room.players.length === 1 ? 'игрок уже за столом' : 'игроков уже за столом'}
          </span>
        </div>
      ) : (
        <>
          {room.game === 'roulette' && (
            <div className="roulette-stage">
              <Wheel spinning={playing} number={o?.number} />
              <div className="roulette-info">
                {result && o?.number !== undefined ? (
                  <>
                    <span className="eyebrow">ВАШЕ ЧИСЛО</span>
                    <strong
                      className={`winning-number ${o.number === 0 ? 'zero' : RED.includes(o.number) ? 'red' : 'black'}`}
                    >
                      {o.number}
                    </strong>
                    <p>
                      {o.number === 0 ? 'Зеро' : RED.includes(o.number) ? 'Красное' : 'Чёрное'}
                      {o.number !== 0 ? ` · ${o.number! % 2 ? 'Нечётное' : 'Чётное'}` : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="eyebrow">ЕВРОПЕЙСКАЯ РУЛЕТКА</span>
                    <h2>{playing ? 'Колесо удачи' : 'Сделайте вашу ставку'}</h2>
                    <p>
                      Одно зеро. 37 возможностей.
                      <br />
                      Какое число сегодня ваше?
                    </p>
                    <span className="felt-payout">STRAIGHT UP PAYS 35 TO 1</span>
                  </>
                )}
              </div>
            </div>
          )}
          {room.game === 'dice' && (
            <div className="dice-stage">
              <span className="eyebrow">БРОСОК НА УДАЧУ</span>
              <h2>
                {result && o?.dice
                  ? `Выпало ${o.dice[0] + o.dice[1]}`
                  : playing
                    ? 'Кубики брошены'
                    : 'Пусть кости решат'}
              </h2>
              <div className={`dice-pair ${playing ? 'rolling' : ''}`}>
                {(o?.dice || [3, 5]).map((n, i) => (
                  <Die key={i} value={n} />
                ))}
              </div>
              <p>
                {result && o?.dice
                  ? o.dice[0] === o.dice[1]
                    ? 'Дубль! Удача любит повторяться.'
                    : `${o.dice[0]} + ${o.dice[1]} · ${o.dice[0] + o.dice[1] < 7 ? 'Меньше 7' : o.dice[0] + o.dice[1] > 7 ? 'Больше 7' : 'Ровно 7'}`
                  : 'Два честных кубика. Выплаты без комиссии.'}
              </p>
            </div>
          )}
          {room.game === 'ducks' && (
            <div className="duck-stage">
              <div className="race-title">
                <span className="eyebrow">БОЛЬШОЙ КУБОК ПРУДА</span>
                <h2>
                  {result && o?.winner !== undefined
                    ? `${DUCKS[o.winner].name} побеждает!`
                    : playing
                      ? 'Кряк — и вперёд!'
                      : 'На кого поставим?'}
                </h2>
              </div>
              <div className="race-track">
                {DUCKS.map((d, i) => {
                  const t = playing
                    ? Math.max(0, Math.min(0.88, ((now - (rd?.startedAt || now)) / 18000) * 0.85))
                    : result
                      ? o?.winner === i
                        ? 1
                        : 0.78 + i * 0.04
                      : 0;
                  const wave = playing
                    ? Math.sin((now - (rd?.startedAt || now)) / 1300 + i * 1.7) * 0.045
                    : 0;
                  return (
                    <div
                      className="race-lane"
                      key={d.name}
                      style={{ '--duck-color': d.color } as React.CSSProperties}
                    >
                      <span className="lane-number">0{i + 1}</span>
                      <div className="water-line" />
                      <span
                        className="race-duck"
                        style={{ left: `${9 + Math.min(1, Math.max(0, t + wave)) * 77}%` }}
                      >
                        <Duck color={d.color} />
                        <small>{d.name}</small>
                      </span>
                      <span className="finish-line" />
                    </div>
                  );
                })}
              </div>
              <div className="race-legend">
                {DUCKS.map((d, i) => (
                  <span key={d.name} style={{ color: d.color }}>
                    {result && o?.winner === i ? '♛' : '●'} {d.name} <small>×4</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          {room.game === 'baccarat' && (
            <div className="baccarat-stage">
              <div className="eyebrow">PUNTO BANCO · 8 КОЛОД</div>
              <div className="baccarat-hands">
                {(['player', 'banker'] as const).map((side) => (
                  <div
                    className={`baccarat-side ${result && o?.side === side ? 'winner' : ''}`}
                    key={side}
                  >
                    <h2>
                      {side === 'player' ? 'Игрок' : 'Банкир'}{' '}
                      <span>{o?.[side] ? baccaratScore(o[side]!) : '—'}</span>
                    </h2>
                    <div className="cards-row">
                      {(o?.[side] || [null, null]).map((c, i) => (
                        <CardView key={i} card={c} />
                      ))}
                    </div>
                    <small>{side === 'player' ? 'ВЫПЛАТА 1:1' : 'ВЫПЛАТА 0,95:1'}</small>
                  </div>
                ))}
              </div>
              <p className="baccarat-verdict">
                {result && o?.side
                  ? o.side === 'tie'
                    ? 'Ничья · основные ставки возвращены'
                    : o.side === 'player'
                      ? 'Побеждает игрок'
                      : 'Побеждает банкир'
                  : playing
                    ? 'Карты решают всё'
                    : 'Выберите сторону. Доверьтесь раздаче.'}
              </p>
            </div>
          )}
          {room.game === 'blackjack' && (
            <div className="blackjack-stage">
              <div className="dealer-zone">
                <span className="eyebrow">
                  ДИЛЕР{' '}
                  {result && rd?.blackjack
                    ? '· ' + handValue(rd.blackjack.dealer.filter(Boolean) as Card[]).total
                    : ''}
                </span>
                <div className="cards-row">
                  {(rd?.blackjack?.dealer || [null, null]).map((c, i) => (
                    <CardView card={c} key={i} />
                  ))}
                </div>
                <span className="dealer-rule">BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON ALL 17</span>
              </div>
              <div className="blackjack-seats">
                {rd?.blackjack ? (
                  rd.blackjack.seats.map((seat) => (
                    <div
                      className={`blackjack-seat ${seat.playerId === room.selfId ? 'own' : ''}`}
                      key={seat.playerId}
                    >
                      <span>
                        {room.players.find((p) => p.id === seat.playerId)?.avatar}{' '}
                        {room.players.find((p) => p.id === seat.playerId)?.name}
                      </span>
                      <div className="split-hands">
                        {seat.hands.map((h, i) => (
                          <div
                            className={`mini-hand ${h.status === 'playing' && playing ? 'active-hand' : ''}`}
                            key={i}
                          >
                            <div className="cards-row">
                              {h.cards.map((c, j) => (
                                <CardView card={c} key={j} />
                              ))}
                            </div>
                            <small>
                              {handValue(h.cards).total}
                              {h.status === 'bust'
                                ? ' · Перебор'
                                : !h.split &&
                                    h.cards.length === 2 &&
                                    handValue(h.cards).total === 21
                                  ? ' · Блэкджек'
                                  : h.status === 'stood'
                                    ? ' · Хватит'
                                    : ''}
                              {result && h.payout !== undefined
                                ? ` · выплата ${money(h.payout)}`
                                : ''}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-blackjack">
                    <span>♠</span>
                    <h2>Ваша следующая — двадцать одно?</h2>
                    <p>Сделайте ставку, чтобы получить карты.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {result && rd?.payouts && Object.keys(rd.payouts).length === 0 && (
            <div className="no-bets">Ставок не было · начнём следующий раунд?</div>
          )}
        </>
      )}
    </div>
  );
}
function baccaratScore(cards: Card[]) {
  return cards.reduce((s, c) => s + (c.rank >= 10 ? 0 : c.rank), 0) % 10;
}
function Duck({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 80 65" aria-hidden="true">
      <path
        d="M10 35c-8-3-6-8-5-10 5 5 11 5 15 4 0-14 8-23 21-22 15 0 24 13 20 26 4 2 7 2 12 1-2 17-17 25-35 25C22 59 9 51 10 35Z"
        fill={color}
      />
      <path d="M62 22h16l-3 9H61Z" fill="#ed8b40" />
      <circle cx="51" cy="18" r="3" fill="#172d27" />
      <path d="M19 37c8-6 21-5 28 3-4 12-24 14-28-3Z" fill="#fff" fillOpacity=".24" />
    </svg>
  );
}
function Die({ value }: { value: number }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <div className="die" aria-label={`Кубик: ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={dots[value].includes(i) ? 'dot' : ''} />
      ))}
    </div>
  );
}
function Leaderboard({ room }: { room: PublicRoom }) {
  let previous: number | undefined,
    rank = 0;
  return (
    <div className="leaderboard">
      {[...room.players]
        .sort((a, b) => b.balance - a.balance)
        .map((p, i) => {
          if (previous !== p.balance) rank = i + 1;
          previous = p.balance;
          const bets =
            room.round?.bets.filter((b) => b.playerId === p.id).reduce((s, b) => s + b.amount, 0) ||
            0;
          return (
            <div className={`player-row ${p.id === room.selfId ? 'self' : ''}`} key={p.id}>
              <span className={`place ${rank === 1 ? 'first' : ''}`}>
                {rank === 1 ? <Crown size={15} /> : String(rank).padStart(2, '0')}
              </span>
              <span className="player-avatar">{p.avatar}</span>
              <div className="player-name">
                <strong>
                  {p.name}
                  {p.id === room.selfId && <small> вы</small>}
                </strong>
                <small>
                  {p.rebuyRequested
                    ? 'Ждёт возвращения'
                    : room.phase === 'betting' && room.round?.skips.includes(p.id)
                      ? 'Пропускает'
                      : bets && ['betting', 'playing'].includes(room.phase)
                        ? `На столе ${money(bets)}`
                        : p.rebuys
                          ? `Возвращений: ${p.rebuys}`
                          : 'В игре'}
                </small>
              </div>
              <b className="player-money">
                {money(p.balance)}
                <span>фишек</span>
              </b>
            </div>
          );
        })}
    </div>
  );
}
function FinalBoard({ room }: { room: PublicRoom }) {
  const winners = room.players.filter(
    (p) => p.balance === Math.max(...room.players.map((p) => p.balance)),
  );
  return (
    <div className="final-board">
      <Trophy size={60} />
      <div className="eyebrow">БОЛЬШОЙ ФИНАЛ</div>
      <h2>
        {winners.map((p) => p.name).join(' и ')}
        {winners.length === 1 ? ' забирает' : ' забирают'} славу!
      </h2>
      <p>
        {money(winners[0].balance)} фишек · {room.roundNumber} раундов за одним столом
      </p>
      <Leaderboard room={room} />
      <small>Спасибо за вечер. Повторим?</small>
    </div>
  );
}
function BetPanel({
  room,
  self,
  action,
  busy,
  now,
}: {
  room: PublicRoom;
  self: PublicRoom['players'][number];
  action: (t: string, p?: Record<string, unknown>) => Promise<any>;
  busy: boolean;
  now: number;
}) {
  const [amount, setAmount] = useState(100),
    [target, setTarget] = useState(optionsFor(room.game)[0].id),
    [advanced, setAdvanced] = useState(false),
    [lastBets, setLastBets] = useState<{ target: string; amount: number }[]>([]);
  useEffect(() => {
    setTarget(optionsFor(room.game)[0].id);
    setAdvanced(false);
    setLastBets([]);
  }, [room.game]);
  const rd = room.round,
    myBets = rd?.bets.filter((b) => b.playerId === self.id) || [],
    total =
      rd?.blackjack?.seats
        .find((s) => s.playerId === self.id)
        ?.hands.reduce((s, h) => s + h.stake, 0) ?? myBets.reduce((s, b) => s + b.amount, 0),
    opts = optionsFor(room.game),
    opt = opts.find((o) => o.id === target) || opts[0];
  useEffect(() => {
    if (room.phase === 'result' && myBets.length)
      setLastBets(myBets.map(({ target, amount }) => ({ target, amount })));
  }, [room.phase, rd?.id]);
  const blackjackSeat = rd?.blackjack?.seats.find((s) => s.playerId === self.id),
    handIndex = blackjackSeat?.hands.findIndex((h) => h.status === 'playing') ?? -1,
    hand = blackjackSeat?.hands[handIndex];
  const canRebuy =
    self.balance < room.settings.minBet &&
    self.rebuys < room.settings.maxRebuys &&
    !(total && ['betting', 'playing'].includes(room.phase));
  async function place() {
    const old = myBets.find((b) => b.target === target)?.amount || 0;
    await action('bet', { target, amount: Math.round(amount * 100) + old });
  }
  async function repeat() {
    for (const b of lastBets) {
      const result = await action('bet', b);
      if (!result) break;
    }
  }
  return (
    <section className="bet-panel">
      <div className="bet-heading">
        <div>
          <span className="balance-label">ВАШ БАЛАНС</span>
          <strong>
            {money(self.balance)} <span>фишек</span>
          </strong>
        </div>
        <div className="your-stake">
          <span>НА СТОЛЕ</span>
          <b>{money(total)}</b>
        </div>
        {room.phase === 'result' && rd?.payouts && total > 0 && (
          <div
            className={`personal-result ${(rd.payouts[self.id] || 0) >= total ? 'positive' : ''}`}
          >
            <small>ВЫПЛАТА</small>
            <b>{money(rd.payouts[self.id] || 0)}</b>
            <span>
              Результат {(rd.payouts[self.id] || 0) - total >= 0 ? '+' : ''}
              {money((rd.payouts[self.id] || 0) - total)}
            </span>
          </div>
        )}
      </div>
      {canRebuy ? (
        <div className="rebuy-message">
          <div>
            <h3>Ещё один заход?</h3>
            <p>
              Возвращение {self.rebuys + 1} из {room.settings.maxRebuys} · новый баланс{' '}
              {money(room.settings.startingBalance)}
            </p>
          </div>
          <button
            className="gold-button"
            disabled={busy || self.rebuyRequested}
            onClick={() => {
              if (
                self.balance > 0 &&
                !confirm(
                  `Сдать оставшиеся ${money(self.balance)} фишек и запросить повторный вход?`,
                )
              )
                return;
              action('rebuy-request', { forfeitRemainder: self.balance > 0 });
            }}
          >
            {self.rebuyRequested
              ? 'Ведущий получил запрос'
              : self.balance > 0
                ? 'Сдать остаток и вернуться'
                : 'Вернуться в игру'}
            <RotateCcw size={17} />
          </button>
        </div>
      ) : room.phase === 'betting' ? (
        <>
          <div className="bet-choices">
            {room.game === 'roulette' ? (
              <>
                <div className="roulette-bets">
                  <button
                    className={`number-button green ${target === 'n:0' ? 'selected' : ''}`}
                    onClick={() => setTarget('n:0')}
                  >
                    0
                  </button>
                  <div className="number-grid">
                    {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
                      <button
                        className={`number-button ${RED.includes(n) ? 'red' : 'black'} ${target === `n:${n}` ? 'selected' : ''}`}
                        key={n}
                        onClick={() => setTarget(`n:${n}`)}
                      >
                        {n}
                        {myBets.some((b) => b.target === `n:${n}`) && <i />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="outside-bets">
                  {opts
                    .filter((o) => ['low', 'even', 'red', 'black', 'odd', 'high'].includes(o.id))
                    .sort(
                      (a, b) =>
                        ['low', 'even', 'red', 'black', 'odd', 'high'].indexOf(a.id) -
                        ['low', 'even', 'red', 'black', 'odd', 'high'].indexOf(b.id),
                    )
                    .map((o) => (
                      <button
                        className={`${target === o.id ? 'selected' : ''} ${o.id}`}
                        key={o.id}
                        onClick={() => setTarget(o.id)}
                      >
                        {o.label}
                      </button>
                    ))}
                </div>
                <button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}>
                  Дюжины, колонки и составные ставки <ChevronDown size={14} />
                </button>
                {advanced && (
                  <label className="advanced-select">
                    Тип ставки
                    <select value={target} onChange={(e) => setTarget(e.target.value)}>
                      {opts.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label} · ×{o.multiplier}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            ) : room.game === 'blackjack' ? (
              <p className="bet-explanation">
                Сделайте ставку, чтобы получить свою руку. Блэкджек оплачивается 3:2.
              </p>
            ) : (
              <div className={`option-grid ${room.game}`}>
                {opts.map((o) => (
                  <button
                    key={o.id}
                    className={`bet-option ${target === o.id ? 'selected' : ''}`}
                    onClick={() => setTarget(o.id)}
                  >
                    {room.game === 'ducks' && <Duck color={DUCKS[Number(o.id)].color} />}
                    <strong>{o.label}</strong>
                    <span>×{Number(o.multiplier.toFixed(2)).toLocaleString('ru-RU')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="wager-controls">
            <div className="amount-control">
              <label htmlFor="wager">СТАВКА</label>
              <input
                id="wager"
                type="number"
                inputMode="numeric"
                min={room.settings.minBet / 100}
                max={room.settings.maxBet / 100}
                step="10"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <span>фишек</span>
            </div>
            <div className="chip-presets">
              {[50, 100, 500, 1000]
                .filter((n) => n * 100 >= room.settings.minBet && n * 100 <= room.settings.maxBet)
                .map((n) => (
                  <button
                    className={`chip-preset ${amount === n ? 'selected' : ''}`}
                    key={n}
                    onClick={() => setAmount(n)}
                  >
                    {n >= 1000 ? '1К' : n}
                  </button>
                ))}
            </div>
            <button
              className="gold-button place-bet"
              disabled={busy || !Number.isInteger(amount) || amount <= 0}
              onClick={place}
            >
              Поставить {money(Math.round(amount * 100))}
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="bet-summary">
            <span>
              {opt.label} · возможная выплата{' '}
              <strong>{money(Math.round(amount * 100 * opt.multiplier))}</strong>
            </span>
            <span>Лимит раунда: {money(room.settings.maxBet)}</span>
          </div>
          {myBets.length > 0 && (
            <div className="placed-bets">
              {myBets.map((b) => (
                <span key={b.target}>
                  {opts.find((o) => o.id === b.target)?.label} <b>{money(b.amount)}</b>
                </span>
              ))}
            </div>
          )}
          <div className="bet-secondary">
            <button disabled={busy || !myBets.length} onClick={() => action('clear')}>
              <X size={14} /> Отменить ставки
            </button>
            <button disabled={busy || !lastBets.length || !!myBets.length} onClick={repeat}>
              <RotateCcw size={14} /> Повторить прошлые
            </button>
            <button
              className={rd?.skips.includes(self.id) ? 'skipped' : ''}
              disabled={busy}
              onClick={() => action('skip')}
            >
              {rd?.skips.includes(self.id) ? <Check size={14} /> : null}Пропустить раунд
            </button>
          </div>
        </>
      ) : room.game === 'blackjack' && room.phase === 'playing' && hand ? (
        <div className="blackjack-actions">
          <div>
            <span className="eyebrow">ВАШ ХОД · РУКА {handIndex + 1}</span>
            <h3>
              {handValue(hand.cards).total} очков{' '}
              <small>{Math.max(0, Math.ceil((hand.deadline - now) / 1000))} сек</small>
            </h3>
          </div>
          <div className="action-buttons">
            <button
              className="gold-button"
              disabled={busy}
              onClick={() => action('blackjack', { move: 'hit', handIndex })}
            >
              Ещё
            </button>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => action('blackjack', { move: 'stand', handIndex })}
            >
              Хватит
            </button>
            {hand.cards.length === 2 && !hand.splitAces && (
              <button
                className="outline-button"
                disabled={busy || self.balance < hand.stake}
                onClick={() => action('blackjack', { move: 'double', handIndex })}
              >
                Удвоить
              </button>
            )}
            {hand.cards.length === 2 &&
              hand.cards[0].rank === hand.cards[1].rank &&
              !hand.splitAces &&
              blackjackSeat!.hands.length < 4 && (
                <button
                  className="outline-button"
                  disabled={busy || self.balance < hand.stake}
                  onClick={() => action('blackjack', { move: 'split', handIndex })}
                >
                  Разделить
                </button>
              )}
          </div>
        </div>
      ) : (
        <div className="waiting-message">
          <span>{room.phase === 'lobby' ? '♠' : room.phase === 'playing' ? '✦' : '♥'}</span>
          <p>
            {room.phase === 'lobby'
              ? 'Ваше место за столом уже ждёт.'
              : room.phase === 'playing'
                ? 'Ставки приняты. Следим за игрой!'
                : self.balance === 0
                  ? 'Фишки закончились. Можно продолжать болеть за друзей.'
                  : 'Раунд завершён. Готовимся к следующему?'}
            <small>
              {room.phase === 'lobby'
                ? 'Ведущий выбирает игру и открывает ставки.'
                : room.phase === 'playing'
                  ? 'Баланс обновится после расчёта раунда.'
                  : 'Баланс сохранён. Все выплаты уже учтены.'}
            </small>
          </p>
        </div>
      )}
    </section>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" autoFocus onClick={close} aria-label="Закрыть">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Invite({
  room,
  notify,
  hostToken,
}: {
  room: PublicRoom;
  notify: (s: string) => void;
  hostToken?: string;
}) {
  const [qr, setQr] = useState(''),
    [copied, setCopied] = useState('');
  const url = `${location.origin}/?room=${room.code}`;
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: { dark: '#12392e', light: '#fcf5e5' },
    }).then(setQr);
  }, [url]);
  async function copy(value: string, type: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      notify('Скопируйте ссылку вручную из поля ниже.');
    }
  }
  return (
    <div className="invite-content">
      <p>Наведите камеру телефона. Имя, аватар — и вы в игре.</p>
      {qr && (
        <img
          className="qr-code"
          src={qr}
          width={230}
          height={230}
          alt={`QR-код для входа в комнату ${room.code}`}
        />
      )}
      <span className="side-label">КОД КОМНАТЫ</span>
      <strong className="invite-code">{room.code}</strong>
      <div className="copy-field">
        <input readOnly aria-label="Ссылка приглашения" value={url} />
        <button
          className="icon-button"
          aria-label="Скопировать приглашение"
          onClick={() => copy(url, 'join')}
        >
          {copied === 'join' ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>
      {room.role === 'host' && (
        <>
          <div className="modal-divider" />
          <h3>
            <Monitor size={20} /> Общий экран для телевизора
          </h3>
          <p>Откройте эту ссылку в браузере телевизора или на устройстве, подключённом по HDMI.</p>
          <div className="copy-field">
            <input
              readOnly
              aria-label="Ссылка зрителя"
              value={`${location.origin}/#watch=${room.spectatorToken}`}
            />
            <button
              className="icon-button"
              aria-label="Скопировать ссылку зрителя"
              onClick={() => copy(`${location.origin}/#watch=${room.spectatorToken}`, 'watch')}
            >
              {copied === 'watch' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <a
            className="outline-button full"
            href={`/#watch=${room.spectatorToken}`}
            target="_blank"
            rel="noreferrer"
          >
            Открыть экран зрителя <ArrowUpRight size={17} />
          </a>
          {hostToken && (
            <>
              <div className="modal-divider" />
              <h3>
                <Crown size={19} /> Личная ссылка ведущего
              </h3>
              <p>
                Сохраните себе для возвращения с другого устройства. Эта ссылка даёт управление
                комнатой — не отправляйте её игрокам.
              </p>
              <div className="copy-field">
                <input
                  readOnly
                  aria-label="Личная ссылка ведущего"
                  value={`${location.origin}/#recover=${hostToken}`}
                />
                <button
                  className="icon-button"
                  aria-label="Скопировать ссылку ведущего"
                  onClick={() => copy(`${location.origin}/#recover=${hostToken}`, 'host')}
                >
                  {copied === 'host' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
function Admin({
  room,
  action,
  busy,
  notify,
  close,
}: {
  room: PublicRoom;
  action: (t: string, p?: Record<string, unknown>) => Promise<any>;
  busy: boolean;
  notify: (s: string) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState<Settings>({ ...room.settings }),
    [recipient, setRecipient] = useState('all'),
    [grant, setGrant] = useState(1000),
    [recovery, setRecovery] = useState('');
  const editable = ['lobby', 'result'].includes(room.phase);
  return (
    <div className="admin-content">
      <p className="muted-text">
        Изменения правил применяются между раундами. Выдачи фишек записываются в историю.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await action('settings', { settings: draft });
          if (r) notify('Настройки сохранены');
        }}
      >
        <div className="settings-grid">
          {(
            [
              {
                key: 'startingBalance',
                label: 'Стартовый баланс',
                money: true,
                min: 10,
                max: 1000000,
              },
              { key: 'minBet', label: 'Минимальная ставка', money: true, min: 10, max: 100000 },
              { key: 'maxBet', label: 'Лимит ставок на раунд', money: true, min: 10, max: 1000000 },
              { key: 'maxRebuys', label: 'Повторных входов', min: 0, max: 20 },
              { key: 'betSeconds', label: 'Время ставок, сек', min: 5, max: 180 },
              { key: 'actionSeconds', label: 'Время решения, сек', min: 5, max: 120 },
            ] as const
          ).map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                type="number"
                required
                disabled={!editable || (f.key === 'startingBalance' && room.roundNumber > 0)}
                min={f.min}
                max={f.max}
                step={'money' in f ? 10 : 1}
                value={draft[f.key] / ('money' in f ? 100 : 1)}
                onChange={(e) =>
                  setDraft({ ...draft, [f.key]: Number(e.target.value) * ('money' in f ? 100 : 1) })
                }
              />
            </label>
          ))}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.auto}
            disabled={!editable}
            onChange={(e) => setDraft({ ...draft, auto: e.target.checked })}
          />{' '}
          Автоматически открывать следующий раунд через 8 секунд
        </label>
        <button className="gold-button full" disabled={busy || !editable || room.phase === 'ended'}>
          Сохранить настройки
        </button>
        {!editable && <small className="muted-text">Дождитесь завершения текущего раунда.</small>}
      </form>
      <div className="modal-divider" />
      <h3>Возвращения за стол</h3>
      {room.players.some((p) => p.rebuyRequested) ? (
        room.players
          .filter((p) => p.rebuyRequested)
          .map((p) => (
            <div className="admin-player" key={p.id}>
              <span>
                {p.avatar} {p.name}
                <small>
                  Заход {p.rebuys + 1}/{room.settings.maxRebuys}
                </small>
              </span>
              <button
                className="gold-button small"
                disabled={busy}
                onClick={() => action('rebuy', { playerId: p.id })}
              >
                Выдать {money(room.settings.startingBalance)}
              </button>
            </div>
          ))
      ) : (
        <p className="muted-text">Запросов на повторный вход пока нет.</p>
      )}
      <div className="modal-divider" />
      <h3>Выдать фишки</h3>
      <div className="grant-controls">
        <label>
          Кому
          <select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
            <option value="all">Всем участникам</option>
            {room.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Сколько
          <input
            type="number"
            min="10"
            max="1000000"
            step="10"
            value={grant}
            onChange={(e) => setGrant(Number(e.target.value))}
          />
        </label>
        <button
          className="outline-button"
          disabled={busy || room.phase === 'ended'}
          onClick={() => action('grant', { playerId: recipient, amount: Math.round(grant * 100) })}
        >
          <Plus size={16} /> Выдать
        </button>
      </div>
      <div className="modal-divider" />
      <h3>Восстановить доступ игрока</h3>
      <p className="muted-text">
        Ссылка заменит прежнюю сессию выбранного игрока. Передайте её лично.
      </p>
      {room.players
        .filter((p) => p.id !== room.selfId)
        .map((p) => (
          <div className="admin-player" key={p.id}>
            <span>
              {p.avatar} {p.name}
            </span>
            <button
              className="subtle-button"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Заменить сессию игрока ${p.name}?`)) return;
                const r = await action('recover', { playerId: p.id });
                if (r?.recoveryToken) setRecovery(`${location.origin}/#recover=${r.recoveryToken}`);
              }}
            >
              Новая ссылка
            </button>
          </div>
        ))}
      {recovery && (
        <input
          aria-label="Ссылка восстановления"
          readOnly
          value={recovery}
          onFocus={(e) => e.target.select()}
        />
      )}
      <div className="modal-divider" />
      <button
        className="danger-button full"
        disabled={!editable || busy || room.phase === 'ended'}
        onClick={async () => {
          if (confirm('Завершить вечер и зафиксировать итоговый рейтинг?')) {
            const r = await action('end');
            if (r) close();
          }
        }}
      >
        Завершить вечер и показать итоги
      </button>
    </div>
  );
}
function LedgerView({ room }: { room: PublicRoom }) {
  return (
    <div className="ledger">
      <p className="muted-text">
        {room.role === 'host'
          ? 'Последние 100 операций всех игроков.'
          : 'Последние 100 операций вашего баланса.'}
      </p>
      {[...room.ledger].reverse().map((l) => (
        <div className="ledger-row" key={l.id}>
          <div>
            <strong>{l.reason}</strong>
            <small>
              {room.players.find((p) => p.id === l.playerId)?.name} ·{' '}
              {new Date(l.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
          <b className={l.amount >= 0 ? 'positive' : 'negative'}>
            {l.amount > 0 ? '+' : ''}
            {money(l.amount)}
          </b>
        </div>
      ))}
    </div>
  );
}
const RULES: Record<Game, { lead: string; rules: string[] }> = {
  roulette: {
    lead: 'Одно колесо для всех. 37 равновероятных чисел, включая одно зеро.',
    rules: [
      'Число — прибыль 35:1; сплит — 17:1; стрит — 11:1; угол — 8:1; линия — 5:1.',
      'Дюжина и колонка — 2:1. Красное/чёрное, чётное/нечётное, 1–18/19–36 — 1:1.',
      'Зеро проигрывает всем внешним ставкам. La Partage и En Prison отключены.',
      'Коэффициент × в интерфейсе включает возврат ставки. В рулетке сохранены стандартные выплаты казино.',
    ],
  },
  blackjack: {
    lead: 'Ваша рука против общего дилера. Цель — приблизиться к 21, не превысив его.',
    rules: [
      '2–10 равны номиналу, J/Q/K — 10, туз — 1 или 11. Ничья возвращает ставку.',
      'Башмак из 6 колод. Блэкджек — туз и карта стоимостью 10 на исходной руке — оплачивается 3:2.',
      'Дилер стоит на любых 17, включая мягкие 17. При тузе или десятке проверяет блэкджек до ваших действий.',
      'Удвоение на первых двух картах, в том числе после разделения: дополнительная ставка и ровно одна карта.',
      'Пары одинакового ранга можно разделить до 4 рук. Разделённым тузам — по одной карте, повторное разделение тузов запрещено. 21 после разделения — обычное 21.',
      'Страховка и surrender отключены. Если время решения закончилось, автоматически выбирается «Хватит».',
    ],
  },
  baccarat: {
    lead: 'Выберите игрока, банкира или ничью. Добор карт происходит автоматически по правилам Punto Banco.',
    rules: [
      'Туз — 1, карты 2–9 по номиналу, 10/J/Q/K — 0. Сумма считается по последней цифре: 7 + 8 = 5.',
      'Натуральные 8 или 9 завершают раздачу без добора. Иначе игрок добирает при 0–5; банкир — по стандартной таблице третьей карты.',
      'Player: прибыль 1:1. Banker: прибыль 0,95:1 после комиссии 5%. Tie: прибыль 8:1.',
      'При ничьей ставки на игрока и банкира возвращаются. Используется башмак из 8 колод.',
    ],
  },
  dice: {
    lead: 'Два честных кубика: каждая из 36 комбинаций равновероятна. Все выплаты без преимущества казино.',
    rules: [
      'Меньше 7 и больше 7 — общая выплата ×2,4. Семёрка проигрывает обеим ставкам.',
      'Ровно 7 — ×6. Дубль (два одинаковых значения) — ×6.',
      'Суммы 2/12 — ×36; 3/11 — ×18; 4/10 — ×12; 5/9 — ×9; 6/8 — ×7,2; 7 — ×6.',
      'Можно поставить на несколько событий. Коэффициенты включают возврат ставки.',
    ],
  },
  ducks: {
    lead: 'Четыре утки, один общий заплыв. У каждой ровно 25% шансов победить.',
    rules: [
      'Выберите одну утку до старта. Ставки закрываются перед заплывом.',
      'Победитель получает общую выплату ×4: ставка 100 превращается в 400. Комиссии нет.',
      'Цвет, имя и положение утки в прошлых гонках не влияют на шанс победы.',
      'Сервер случайно выбирает победителя, а общий экран показывает гонку. Ускорений и подкруток нет.',
    ],
  },
};
function Rules({ game }: { game: Game }) {
  const r = RULES[game];
  return (
    <div className="rules">
      <span className="rules-symbol">{GAMES[game].icon}</span>
      <h3>{GAMES[game].name}</h3>
      <p>{r.lead}</p>
      <ul>
        {r.rules.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="rules-note">
        Все ставки и выплаты — в виртуальных фишках. Рейтинг определяется конечным балансом,
        возвращения не вычитаются.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
