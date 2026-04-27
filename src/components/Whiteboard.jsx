import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Trash2, Download, Pencil, Eraser, Minus, Square, Circle } from 'lucide-react';

const COLORS = ['#1e293b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
const SIZES = [2, 5, 10, 18];

const TOOLS = [
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

export default function Whiteboard({ channel, user, sendWS, onClose }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null); // for shape preview while drawing
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1e293b');
  const [size, setSize] = useState(3);
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshotRef = useRef(null); // canvas snapshot before shape preview

  const getCtx = () => canvasRef.current?.getContext('2d');
  const getOverlayCtx = () => overlayRef.current?.getContext('2d');

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const { width, height } = canvas.parentElement.getBoundingClientRect();
    // Save image before resize
    const img = new Image();
    img.src = canvas.toDataURL();
    canvas.width = width;
    canvas.height = height;
    overlay.width = width;
    overlay.height = height;
    img.onload = () => {
      const ctx = getCtx();
      if (ctx) { ctx.drawImage(img, 0, 0); }
    };
  }, []);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (canvasRef.current?.parentElement) observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // Draw a stroke object onto a given canvas context
  const drawStroke = useCallback((ctx, stroke) => {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    }
    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      ctx.beginPath();
      const pts = stroke.points;
      if (!pts || pts.length < 2) {
        if (pts && pts.length === 1) {
          ctx.beginPath();
          ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
          if (stroke.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
          ctx.fill();
        }
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(stroke.x1, stroke.y1);
      ctx.lineTo(stroke.x2, stroke.y2);
      ctx.stroke();
    } else if (stroke.tool === 'rect') {
      ctx.strokeRect(stroke.x1, stroke.y1, stroke.x2 - stroke.x1, stroke.y2 - stroke.y1);
    } else if (stroke.tool === 'circle') {
      const rx = Math.abs(stroke.x2 - stroke.x1) / 2;
      const ry = Math.abs(stroke.y2 - stroke.y1) / 2;
      const cx = (stroke.x1 + stroke.x2) / 2;
      const cy = (stroke.y1 + stroke.y2) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  // Handle incoming WS events (called from ChatArea)
  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!data || data.channelId !== channel.id) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (data.type === 'whiteboard_state') {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        for (const stroke of (data.strokes || [])) drawStroke(ctx, stroke);
      }
      if (data.type === 'whiteboard_draw') {
        drawStroke(ctx, data.stroke);
      }
      if (data.type === 'whiteboard_clear') {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener('whiteboard_ws', handler);
    // Request current state
    sendWS({ type: 'whiteboard_sync', channelId: channel.id });
    return () => window.removeEventListener('whiteboard_ws', handler);
  }, [channel.id, drawStroke, sendWS]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    drawing.current = true;
    const pos = getPos(e);
    startPos.current = pos;
    if (tool === 'pen' || tool === 'eraser') {
      // start a live path
      const ctx = getCtx();
      ctx.save();
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.restore();
      // store points for stroke
      canvasRef.current._livePoints = [pos];
    } else {
      // snapshot for shape preview
      snapshotRef.current = getCtx().getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const onPointerMove = (e) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    const ctx = getCtx();
    const ov = getOverlayCtx();

    if (tool === 'pen' || tool === 'eraser') {
      const pts = canvasRef.current._livePoints || [];
      pts.push(pos);
      canvasRef.current._livePoints = pts;
      ctx.save();
      ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const last = pts[pts.length - 2] || pts[0];
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
    } else {
      // preview shape on overlay
      ov.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      const previewStroke = { tool, color, size, x1: startPos.current.x, y1: startPos.current.y, x2: pos.x, y2: pos.y };
      drawStroke(ov, previewStroke);
    }
  };

  const onPointerUp = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    const pos = getPos(e);
    const ov = getOverlayCtx();

    let stroke;
    if (tool === 'pen' || tool === 'eraser') {
      const pts = canvasRef.current._livePoints || [pos];
      canvasRef.current._livePoints = [];
      stroke = { tool, color, size, points: pts };
    } else {
      ov.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      stroke = { tool, color, size, x1: startPos.current.x, y1: startPos.current.y, x2: pos.x, y2: pos.y };
      drawStroke(getCtx(), stroke);
    }

    sendWS({ type: 'whiteboard_draw', channelId: channel.id, stroke });
  };

  const handleClear = () => {
    getCtx().clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    sendWS({ type: 'whiteboard_clear', channelId: channel.id });
  };

  const handleSave = () => {
    const link = document.createElement('a');
    link.download = `whiteboard-${channel.name || channel.id}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-main)', borderLeft: '1px solid var(--border)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', backgroundColor: 'var(--bg-chat)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '0.25rem' }}>Tools</span>
        {TOOLS.map(t => (
          <button key={t.id} title={t.label} onClick={() => setTool(t.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: tool === t.id ? '2px solid var(--primary)' : '2px solid transparent', backgroundColor: tool === t.id ? 'var(--primary-light)' : 'transparent', color: tool === t.id ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
            <t.icon size={16} />
          </button>
        ))}

        <div style={{ width: 1, height: 24, backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Color</span>
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)}
            style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: c, border: color === c ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: 'pointer', flexShrink: 0 }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          title="Custom color"
          style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }} />

        <div style={{ width: 1, height: 24, backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Size</span>
        <input type="range" min={1} max={30} value={size} onChange={e => setSize(Number(e.target.value))}
          style={{ width: 72, accentColor: 'var(--primary)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 18 }}>{size}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleClear} title="Clear board"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.625rem', borderRadius: 8, border: '1px solid #fecaca', color: '#dc2626', backgroundColor: '#fef2f2', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            <Trash2 size={13} /> Clear
          </button>
          <button onClick={handleSave} title="Save as PNG"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.625rem', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-main)', backgroundColor: 'var(--bg-chat)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={13} /> Save
          </button>
          <button onClick={onClose} title="Close whiteboard"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-chat)', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, touchAction: 'none' }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={e => { e.preventDefault(); onPointerDown(e); }}
          onTouchMove={e => { e.preventDefault(); onPointerMove(e); }}
          onTouchEnd={e => { e.preventDefault(); onPointerUp(e); }}
        />
        <canvas ref={overlayRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
