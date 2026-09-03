import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const PinInput = forwardRef(function PinInput({ 
  value = '', 
  onChange, 
  onComplete,
  onEnter,
  isGold = false, 
  autoFocus = false,
  length = 4,
  disabled = false,
  autoBlurOnComplete = true
}, ref) {
  const inputRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      inputRefs.current[0]?.focus();
    },
    focusAt: (index) => {
      inputRefs.current[index]?.focus();
    },
    blurAll: () => {
      inputRefs.current.forEach(el => el?.blur());
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }
  }));

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      // Emptying this digit
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    const lastChar = val[val.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const combined = newDigits.join('');
    onChange(combined);

    if (lastChar && index < length - 1) {
      // Auto-focus next input
      inputRefs.current[index + 1]?.focus();
    } else if (lastChar && index === length - 1) {
      // 4th number pressed!
      if (autoBlurOnComplete) {
        // Blur immediately so on-screen mobile keypad closes
        inputRefs.current[index]?.blur();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      }
      if (onComplete) {
        onComplete(combined);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autoBlurOnComplete) {
        inputRefs.current[index]?.blur();
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      }
      if (onEnter) {
        onEnter();
      } else if (value.length === length && onComplete) {
        onComplete(value);
      }
    } else if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === length) {
        if (autoBlurOnComplete) {
          inputRefs.current.forEach(el => el?.blur());
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
        }
        if (onComplete) {
          onComplete(pastedData);
        }
      } else {
        const nextFocus = Math.min(pastedData.length, length - 1);
        inputRefs.current[nextFocus]?.focus();
      }
    }
  };

  return (
    <div className="pin-boxes-container">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          className={`pin-digit-box ${isGold ? 'pin-gold' : ''}`}
          maxLength={1}
          inputMode="numeric"
          pattern="[0-9]"
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          placeholder="•"
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
        />
      ))}
    </div>
  );
});

export default PinInput;
