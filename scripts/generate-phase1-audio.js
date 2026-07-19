#!/usr/bin/env node

/**
 * Phase 1 Audio Generation Script
 * Generates Castilian Spanish audio for all Phase 1 lessons using Google Cloud TTS
 *
 * Setup:
 * 1. Install dependencies: npm install @google-cloud/text-to-speech
 * 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 * 3. Run: node scripts/generate-phase1-audio.js
 */

const fs = require('fs');
const path = require('path');

// Optional: Google Cloud TTS (install separately)
let TextToSpeechClient;
try {
  TextToSpeechClient = require('@google-cloud/text-to-speech').TextToSpeechClient;
} catch (e) {
  TextToSpeechClient = null;
}

// Phase 1 audio scripts from PHASE1_CONTENT_STRUCTURE.md
const audioScripts = [
  {
    lessonId: 'lesson-1',
    title: 'Phonetics & First Sounds',
    script: `Escucha: hola, adiós, sí, no, mucho gusto.

Hola. Adiós. Hola. Adiós.

Mucho gusto. Mucho gusto. Mucho gusto, ¿cómo te llamas?

Sí, sí, sí. No, no, no. ¿Sí o no?

Gracias. De nada. Gracias, muchas gracias. De nada.

Perdón. Perdón, ¿dónde está la estación?

Por favor. Un café, por favor. Una agua, por favor.

Buenas noches. Buenas noches, ¿cómo estás? Muy bien, gracias.

Hola a todos. Mucho gusto. Adiós, amigos.`,
    length: '1.5 min',
  },
  {
    lessonId: 'lesson-2',
    title: 'R Sounds & Verbs',
    script: `Escucha: caro vs carro. Caro. Carro. ¿Caro o carro?

Perro. Pero. Perro. Pero. ¿Perro o pero?

Ahora, el verbo ser:

Yo soy. Tú eres. Él es. Ella es. Nosotros somos.

Yo soy María. Tú eres Carlos. Él es doctor. Ella es enfermera.

¿Quién eres? Yo soy José.
Mucho gusto, José. Yo soy María.
Mucho gusto, María.

¿Cómo eres? Soy alto. Soy bajita.

Yo soy inteligente. Tú eres amable. Él es fuerte. Ella es hermosa.

Soy. Eres. Es. Somos.`,
    length: '2 min',
  },
  {
    lessonId: 'lesson-3',
    title: 'First Verbs & Daily Actions',
    script: `Todos los días:

Yo hablo español. Tú hablas inglés. Él habla portugués.

Yo como pan. Tú comes fruta. Ella come verdura.

Yo vivo en Madrid. Tú vives en Barcelona. Nosotros vivimos en España.

¿Tienes un perro? Yo tengo un gato. Él tiene dos hermanos.

¿Dónde estás? Estoy en casa. Ella está en la oficina.

Voy al trabajo. Él va al mercado. Nosotros vamos al parque.

¿Qué haces? Hago mi tarea. Ella hace la comida.

Ahora es de mañana. Yo trabajo ahora. Nosotros comemos ahora.

Mañana, vamos al cine. Hablamos con amigos. Comemos pizza.

Por la noche, descanso. Duermo. Me voy a casa.`,
    length: '2.5 min',
  },
  {
    lessonId: 'lesson-4',
    title: 'Family & Relationships',
    script: `Mi familia:

Mi padre es ingeniero. Mi madre es doctora.

Tengo un hermano y una hermana.

Mi hermano se llama Carlos. Él tiene treinta años. Él vive en Barcelona.

Mi hermana se llama Sofía. Ella tiene veinticuatro años. Ella vive con nosotros en Madrid.

Mi abuelo es jubilado. Mi abuela es muy amable.

Mi hijo se llama Pedro. Tiene cinco años.

Mi hija se llama Rosa. Tiene tres años.

¿Cuántos hermanos tienes? Yo tengo dos hermanos.

¿Dónde vive tu padre? Mi padre vive aquí.

¿Cuál es el nombre de tu madre? Su nombre es Carmen.

Mi familia es pequeña. Mi familia es feliz.

Nosotros comemos juntos. Hablamos cada día. Nos queremos mucho.`,
    length: '2 min',
  },
  {
    lessonId: 'lesson-5',
    title: 'Common Nouns & Places',
    script: `La casa:

Yo vivo en una casa grande. Mi casa tiene tres dormitorios.

Hay una cocina. Hay un comedor. Hay una sala.

En la cocina:

Hay pan en la mesa. Hay agua en la botella. Hay café en la taza.

Como carne, fruta, verdura, pan cada día.

El tiempo:

Hoy es un día hermoso. El día es soleado. El tiempo es bueno.

Por la mañana, desayuno. Como pan y café.

Al mediodía, como carne y verdura.

Por la tarde, como fruta.

Por la noche, como pan y queso.

¿Hay agua? Sí, hay agua.

¿Hay leche? Sí, hay leche.

¿Qué hay en la casa? Hay muebles, hay ropa, hay comida.

Cada día es igual. Cada día, como, trabajo, duermo.`,
    length: '2 min',
  },
  {
    lessonId: 'lesson-6',
    title: 'Adjectives & Descriptions',
    script: `Las descripciones:

El tiempo es bueno. El tiempo es malo. El día es hermoso.

Mi casa es grande. Tu casa es pequeña. Su casa es nueva.

Mi coche es nuevo. Tu coche es viejo. Su coche es bonito.

Los colores:

El coche es rojo. La casa es blanca. El árbol es verde.

Las personas:

Él es alto. Ella es bajita.

Él es joven. Ella es vieja.

Él es guapo. Ella es hermosa.

Él es fuerte. Ella es débil.

Él es inteligente. Ella es estudiosa.

La comida:

El pan es bueno. La fruta es buena. El agua es buena.

El café es caliente. El hielo es frío.

El pan es nuevo. El pan viejo no es bueno.

La ropa:

La camisa es roja. El pantalón es azul. El vestido es hermoso.

La casa es grande, bonita, y nueva. La casa es muy agradable.`,
    length: '2.5 min',
  },
  {
    lessonId: 'lesson-7',
    title: 'Consolidation & Review',
    script: `Hola, me llamo Santiago. Te cuento mi historia.

Mi familia es pequeña. Mi padre es ingeniero. Mi madre es doctora. Tengo un hermano y una hermana.

Yo vivo en una casa grande en Madrid. Mi casa tiene cuatro dormitorios.

Cada día, me despierto por la mañana. Desayuno pan y café. Es bueno. Es caliente.

Voy al trabajo. Trabajo en una oficina grande. Hablo con mis amigos. Hacemos proyectos interesantes.

Al mediodía, como carne y verdura. Después, trabajo más.

Mi hermano vive en Barcelona. Él es abogado. Es muy inteligente. Es joven, pero trabaja mucho.

Mi hermana vive con nosotros. Ella es enfermera. Trabaja en un hospital. Es amable y bonita.

Por la tarde, vuelvo a casa. Descanso. Hablo con mi familia.

Mi abuelo vive con nosotros. Él es jubilado. Hace sesenta años que se casó con mi abuela. Se quieren mucho.

Por la noche, cenamos juntos. Comemos pollo, verdura, y pan. Después, miramos la televisión. Hablamos de nuestros días.

Antes de dormir, leo un libro. Es un libro bueno. Es nuevo.

Duermo bien. El día termina.

Cada día es igual, pero diferente. Cada día tiene sorpresas. Cada día tengo tiempo con mi familia.

Mi vida es buena. Soy feliz. Tengo todo lo que necesito.`,
    length: '3 min',
  },
];

async function generateAudio() {
  try {
    // Check if Google Cloud TTS is available
    if (!TextToSpeechClient) {
      console.log('⚠️  @google-cloud/text-to-speech not installed');
      console.log('Install with: npm install @google-cloud/text-to-speech');
      console.log('For MVP: Using placeholder audio files\n');
      generatePlaceholderAudio();
      return;
    }

    // Check for credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️  GOOGLE_APPLICATION_CREDENTIALS not set');
      console.log('For production: Set up Google Cloud credentials');
      console.log('For MVP: Using placeholder audio files\n');
      generatePlaceholderAudio();
      return;
    }

    const client = new TextToSpeechClient();
    const outputDir = path.join(__dirname, '../backend/public/audio');

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('🎙️ Generating Phase 1 Audio (Castilian Spanish)...\n');

    for (const lesson of audioScripts) {
      console.log(`📝 Lesson ${lesson.lessonId}: ${lesson.title} (${lesson.length})`);

      const request = {
        input: { text: lesson.script },
        voice: {
          languageCode: 'es-ES', // Spain Spanish
          name: 'es-ES-Neural2-B', // Male voice, natural sounding
          ssmlGender: 'MALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0, // Native speed
        },
      };

      try {
        const [response] = await client.synthesizeSpeech(request);

        const audioFile = path.join(outputDir, `${lesson.lessonId}.mp3`);
        fs.writeFileSync(audioFile, response.audioContent, 'binary');

        const sizeKb = fs.statSync(audioFile).size / 1024;
        console.log(`   ✅ Generated: ${lesson.lessonId}.mp3 (${sizeKb.toFixed(1)} KB)\n`);
      } catch (error) {
        console.error(`   ❌ Failed to generate audio: ${error}\n`);
      }
    }

    console.log('✅ Audio generation complete!');
    console.log(`📁 Files saved to: ${outputDir}`);
    console.log('\n📤 Next: Upload to CDN and update lesson audio_urls in database\n');
  } catch (error) {
    console.error('❌ Error:', error);
    generatePlaceholderAudio();
  }
}

function generatePlaceholderAudio() {
  console.log('📝 Creating placeholder audio files for MVP...\n');

  const outputDir = path.join(__dirname, '../backend/public/audio');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const lesson of audioScripts) {
    // Create a minimal valid MP3 file (ID3 header + silence)
    // This is a valid MP3 frame that most players can read
    const mp3Header = Buffer.from([
      0xFF, 0xFB, 0x10, 0x00, // MPEG Layer 3 sync
      0x00, 0x00, 0x00, 0x00, // Minimal frame data
    ]);

    const audioFile = path.join(outputDir, `${lesson.lessonId}.mp3`);
    fs.writeFileSync(audioFile, mp3Header);

    console.log(`   ✅ Created placeholder: ${lesson.lessonId}.mp3`);
  }

  console.log(`\n📁 Placeholder files saved to: ${outputDir}`);
  console.log('⚠️  Replace with real audio by running with Google Cloud credentials\n');
}

// Run
generateAudio();
