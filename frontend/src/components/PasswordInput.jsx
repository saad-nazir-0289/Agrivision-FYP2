import { useState } from 'react';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input type={show ? 'text' : 'password'} {...props} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}