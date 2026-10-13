import { render, screen } from '@testing-library/react';
import App from './App';

test('affiche la page de connexion unifiée quand personne n\'est connecté', () => {
  localStorage.clear();
  render(<App />);
  expect(screen.getByRole('heading', { name: /connexion/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email ou matricule/i)).toBeInTheDocument();
});
