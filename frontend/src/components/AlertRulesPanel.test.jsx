import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import AlertRulesPanel from './AlertRulesPanel';
import { api } from '../services/api';

// Mock the global API service module to isolate component testing
vi.mock('../services/api', () => ({ 
  api: vi.fn() 
}));

const defaults = { 
  ndvi: { high: 0.33, moderate: 0.45, low: 0.6 }, 
  drop: { high: 0.15, moderate: 0.1, low: 0.05 } 
};

const saved = { 
  ndvi: { high: 0.3, moderate: 0.4, low: 0.5 }, 
  drop: { high: 0.2, moderate: 0.1, low: 0.05 } 
};

// Helper function to scope queries within specific form fieldsets
async function getGroupElement(nameRegex) {
  let groupElement = await screen.findByRole('group', { name: nameRegex });
  return within(groupElement);
}

async function getNdviGroup() {
  return await getGroupElement(/NDVI is below/);
}

async function getDropGroup() {
  return await getGroupElement(/fallen by at least/);
}

// Helper function to simulate user typing into an input field
function typeIntoInput(inputNode, textValue) {
  fireEvent.change(inputNode, { target: { value: textValue } });
}

// Reset and configure mock API behavior before each test runs
beforeEach(() => {
  api.mockReset();
  api.mockImplementation(async function (path, options) {
    if (options?.method === 'PATCH') {
      return { rules: options.body };
    }
    return { rules: saved, defaults: defaults };
  });
});

describe('AlertRulesPanel Component Tests', () => {

  it('should display the saved threshold numbers correctly upon loading', async () => {
    render(<AlertRulesPanel />);
    
    let ndviPanel = await getNdviGroup();
    expect(ndviPanel.getByLabelText('High')).toHaveValue(0.3);
    expect(ndviPanel.getByLabelText('Low')).toHaveValue(0.5);
    
    let dropPanel = await getDropGroup();
    expect(dropPanel.getByLabelText('High')).toHaveValue(0.2);
  });

  it('should save input values as numbers and display a success status message', async () => {
    render(<AlertRulesPanel />);
    
    let ndviPanel = await getNdviGroup();
    typeIntoInput(ndviPanel.getByLabelText('High'), '0.25');
    
    let saveButton = screen.getByRole('button', { name: 'Save rules' });
    fireEvent.click(saveButton);
    
    let statusMessage = await screen.findByRole('status');
    expect(statusMessage).toHaveTextContent('Alert rules saved');
    
    expect(api).toHaveBeenCalledWith('/admin/alert-rules', {
      method: 'PATCH',
      body: { 
        ndvi: { high: 0.25, moderate: 0.4, low: 0.5 }, 
        drop: saved.drop 
      },
    });
  });

  it('should display server error messages and retain the user input on failure', async () => {
    // Override mock to simulate server validation rejection
    api.mockImplementation(async function (path, options) {
      if (options?.method === 'PATCH') {
        throw new Error('NDVI levels must satisfy 0 < high < moderate < low <= 1');
      }
      return { rules: saved, defaults: defaults };
    });

    render(<AlertRulesPanel />);
    
    let ndviPanel = await getNdviGroup();
    let inputNode = ndviPanel.getByLabelText('High');
    typeIntoInput(inputNode, '0.9');
    
    let saveButton = screen.getByRole('button', { name: 'Save rules' });
    fireEvent.click(saveButton);
    
    let alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent('NDVI levels must satisfy');
    expect(inputNode).toHaveValue(0.9);
  });

  it('should prevent submission and display an error when any field is left empty', async () => {
    render(<AlertRulesPanel />);
    
    let dropPanel = await getDropGroup();
    typeIntoInput(dropPanel.getByLabelText('Low'), '');
    
    let saveButton = screen.getByRole('button', { name: 'Save rules' });
    fireEvent.click(saveButton);
    
    let alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent('Enter all six numbers');
    
    // Ensure no PATCH request was fired to the backend
    let patchWasCalled = api.mock.calls.some(function (callArgs) {
      let options = callArgs[1];
      return options?.method === 'PATCH';
    });
    expect(patchWasCalled).toBe(false);
  });

  it('should restore system default numbers into the form without triggering an API save call', async () => {
    render(<AlertRulesPanel />);
    await screen.findByRole('group', { name: /NDVI is below/ });
    
    let defaultButton = screen.getByRole('button', { name: 'Use default numbers' });
    fireEvent.click(defaultButton);
    
    await waitFor(async function () {
      let ndviPanel = await getNdviGroup();
      expect(ndviPanel.getByLabelText('High')).toHaveValue(0.33);
    });
    
    let patchWasCalled = api.mock.calls.some(function (callArgs) {
      let options = callArgs[1];
      return options?.method === 'PATCH';
    });
    expect(patchWasCalled).toBe(false);
  });

  it('should show an error message and hide the save button if initial data loading fails', async () => {
    api.mockRejectedValue(new Error('Request failed (500)'));
    
    render(<AlertRulesPanel />);
    
    let alertBox = await screen.findByRole('alert');
    expect(alertBox).toHaveTextContent('Request failed (500)');
    
    let saveButton = screen.queryByRole('button', { name: 'Save rules' });
    expect(saveButton).not.toBeInTheDocument();
  });

});