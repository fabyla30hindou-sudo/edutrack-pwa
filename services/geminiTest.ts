import { GoogleGenerativeAI } from '@google/generative-ai';

// Test script pour vérifier l'API Gemini
async function testGeminiAPI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  console.log('🧪 Test de l\'API Gemini...');

  if (!apiKey || apiKey === 'votre_cle_api_gemini_ici') {
    console.error('❌ Clé API manquante ou invalide');
    return;
  }

  console.log('🔑 Clé API détectée:', apiKey.substring(0, 10) + '...');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });

    console.log('📤 Envoi d\'un test simple...');
    const result = await model.generateContent('Bonjour, peux-tu me répondre en une phrase en français ?');
    const response = await result.response;
    const text = response.text();

    console.log('✅ Test réussi ! Réponse:', text);
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);

    if (error.message?.includes('API_KEY_INVALID')) {
      console.error('🔑 La clé API semble invalide');
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      console.error('📊 Quota dépassé');
    } else if (error.message?.includes('PERMISSION_DENIED')) {
      console.error('🚫 Permission refusée');
    } else {
      console.error('🌐 Erreur réseau ou autre');
    }
  }
}

// Exécuter le test si appelé directement
if (typeof window !== 'undefined') {
  // Dans le navigateur, exposer la fonction globalement
  (window as any).testGeminiAPI = testGeminiAPI;
  console.log('💡 Fonction testGeminiAPI disponible dans la console. Tapez testGeminiAPI() pour tester.');
}

export { testGeminiAPI };