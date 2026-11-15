import { legendGradient } from '../utils/ndvi';

const TICKS = [0, 0.33, 0.66, 1];

export default function NdviLegend() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Information Cards Stacked Vertically for Sidebar & Dashboard Compatibility */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Low (Stress) Card */}
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'rgb(215,25,28)', marginRight: '8px', borderRadius: '2px', flexShrink: 0 }}></span>
            <strong style={{ fontSize: '0.85rem', color: '#1f2937' }}>Low (Stress)</strong>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: 0, lineHeight: 1.3, paddingLeft: '18px' }}>
            Low vegetation or stress
          </p>
        </div>

        {/* Moderate Card */}
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'rgb(253,174,97)', marginRight: '8px', borderRadius: '2px', flexShrink: 0 }}></span>
            <strong style={{ fontSize: '0.85rem', color: '#1f2937' }}>Moderate</strong>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: 0, lineHeight: 1.3, paddingLeft: '18px' }}>
            Moderate vegetation in the area
          </p>
        </div>

        {/* Healthy Card */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'rgb(26,150,65)', marginRight: '8px', borderRadius: '2px', flexShrink: 0 }}></span>
            <strong style={{ fontSize: '0.85rem', color: '#1f2937' }}>Healthy</strong>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#4b5563', margin: 0, lineHeight: 1.3, paddingLeft: '18px' }}>
            Dense and healthy vegetation
          </p>
        </div>

      </div>

      {/* Gradient Bar and Ticks */}
      <div style={{ marginTop: '4px' }}>
        <div
          style={{
            background: legendGradient,
            height: '14px',
            borderRadius: '7px',
            marginBottom: '6px',
            width: '100%',
          }}
        />
        
        <div style={{ position: 'relative', height: '18px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1f2937' }}>
          {TICKS.map((v) => (
            <span
              key={v}
              style={{
                position: 'absolute',
                left: `${v * 100}%`,
                transform: v === 0 ? 'translateX(0)' : v === 1 ? 'translateX(-100%)' : 'translateX(-50%)'
              }}
            >
              {v === 0.33 || v === 0.66 ? v.toFixed(2) : v.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
      
    </div>
  );
}