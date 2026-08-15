import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing and shows login screen initially', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /register here/i })).toBeDefined();
  });
});
