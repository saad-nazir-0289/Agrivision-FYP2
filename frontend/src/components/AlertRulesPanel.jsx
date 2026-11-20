import { useEffect, useState } from 'react';
import { api } from '../services/api';

const LEVELS = ['high', 'moderate', 'low'];
const GROUPS = [
  { 
    key: 'ndvi', 
    title: 'Alert when NDVI is below', 
    hint: 'The lower the NDVI, the more serious: High needs the smallest number.' 
  },
  { 
    key: 'drop', 
    title: 'Alert when NDVI has fallen by at least (compared with the previous 7-day average)', 
    hint: 'The bigger the fall, the more serious: High needs the biggest number.' 
  },
];

// Helper function to convert server number rules into text strings using clean for...of loops
function convertRulesToText(rulesObj) {
  let textRules = {
    ndvi: {},
    drop: {}
  };

  for (const levelName of LEVELS) {
    textRules.ndvi[levelName] = String(rulesObj.ndvi[levelName]);
    textRules.drop[levelName] = String(rulesObj.drop[levelName]);
  }

  return textRules;
}

export default function AlertRulesPanel() {
  const [form, setForm] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Fetch saved alert rules when the component loads
  useEffect(() => {
    api('/admin/alert-rules')
      .then(function (data) {
        setForm(convertRulesToText(data.rules));
        setDefaults(data.defaults);
      })
      .catch(function (err) {
        setError(err.message);
      });
  }, []);

  // Handles input text changes for each specific group and level
  function handleInputChange(groupKey, levelName, event) {
    let newValue = event.target.value;
    
    let updatedForm = {
      ndvi: { ...form.ndvi },
      drop: { ...form.drop }
    };

    updatedForm[groupKey][levelName] = newValue;
    setForm(updatedForm);
  }

  // Handles form submission, validation, and PATCH request to backend
  async function saveRules(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    let submissionBody = {
      ndvi: {},
      drop: {}
    };

    let hasEmptyField = false;

    // Using for...of loop to satisfy linter rule S4138
    for (const levelName of LEVELS) {
      let ndviVal = form.ndvi[levelName];
      let dropVal = form.drop[levelName];

      if (ndviVal.trim() === '' || dropVal.trim() === '') {
        hasEmptyField = true;
      }

      // Using Number.NaN instead of global NaN to satisfy S7773
      submissionBody.ndvi[levelName] = ndviVal.trim() === '' ? Number.NaN : Number(ndviVal);
      submissionBody.drop[levelName] = dropVal.trim() === '' ? Number.NaN : Number(dropVal);
    }

    if (hasEmptyField) {
      setError('Enter all six numbers');
      return;
    }

    // Check if any parsed value resulted in NaN using Number.isNaN
    for (const levelName of LEVELS) {
      if (Number.isNaN(submissionBody.ndvi[levelName]) || Number.isNaN(submissionBody.drop[levelName])) {
        setError('Enter all six numbers');
        return;
      }
    }

    setBusy(true);

    try {
      let responseData = await api('/admin/alert-rules', { 
        method: 'PATCH', 
        body: submissionBody 
      });

      setForm(convertRulesToText(responseData.rules));
      setMessage('Alert rules saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Reset form inputs back to system defaults
  function handleResetToDefaults() {
    if (defaults) {
      setForm(convertRulesToText(defaults));
      setMessage('');
      setError('');
    }
  }

  return (
    <div className="card rules">
      <h2>Alert rules</h2>
      <p className="muted">
        These numbers decide how serious an alert is. If a reading matches both rules, the more serious level is used.
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="success" role="status">{message}</p>}
      {!form && !error && <p className="muted">Loading…</p>}

      {form && (
        <form onSubmit={saveRules} noValidate>
          {GROUPS.map(function (groupItem) {
            return (
              <fieldset key={groupItem.key}>
                <legend>{groupItem.title}</legend>
                <p className="muted">{groupItem.hint}</p>
                <div className="rules-grid">
                  {LEVELS.map(function (level) {
                    let inputId = groupItem.key + '-' + level;
                    let capitalizedLevel = level[0].toUpperCase() + level.slice(1);

                    return (
                      <div key={level}>
                        <label htmlFor={inputId}>{capitalizedLevel}</label>
                        <input 
                          id={inputId} 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          max="1" 
                          value={form[groupItem.key][level]} 
                          onChange={function (e) {
                            handleInputChange(groupItem.key, level, e);
                          }} 
                        />
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div className="actions">
            {/* Explicit type="submit" added to satisfy S9011 */}
            <button type="submit" className="btn auto" disabled={busy}>
              {busy ? 'Saving…' : 'Save rules'}
            </button>
            
            <button type="button" className="btn-small" onClick={handleResetToDefaults}>
              Use default numbers
            </button>
          </div>
        </form>
      )}
    </div>
  );
}