// Exemple d'intégration dans ton formulaire de création d'intervention
import { useState } from 'react';
import axios from 'axios';

function GenerateDescriptionButton({ typePanne, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!typePanne.trim()) {
      setError("Renseigne d'abord le type de panne.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        '/api/interventions/generate-description/',
        { type_panne: typePanne },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      onGenerated(res.data.description); // le parent met à jour le champ description (éditable)
    } catch (err) {
      setError("Impossible de générer une description pour l'instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleGenerate} disabled={loading}>
        {loading ? 'Génération...' : '✨ Générer une description'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default GenerateDescriptionButton;