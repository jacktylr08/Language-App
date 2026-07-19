/**
 * Phase 1 Audio Scripts (Castilian Spanish)
 * Used with Web Speech Synthesis API for real-time TTS playback.
 * Each script maps to a lesson by title.
 */

export const audioScripts: Record<string, string> = {
  'Phonetics & First Sounds': `Escucha: hola, adiós, sí, no, mucho gusto.

Hola. Adiós. Hola. Adiós.

Mucho gusto. Mucho gusto. Mucho gusto, ¿cómo te llamas?

Sí, sí, sí. No, no, no. ¿Sí o no?

Gracias. De nada. Gracias, muchas gracias. De nada.

Perdón. Perdón, ¿dónde está la estación?

Por favor. Un café, por favor. Una agua, por favor.

Buenas noches. Buenas noches, ¿cómo estás? Muy bien, gracias.

Hola a todos. Mucho gusto. Adiós, amigos.`,

  'R Sounds & Verbs': `Escucha: caro, carro. Caro. Carro. ¿Caro o carro?

Perro. Pero. Perro. Pero. ¿Perro o pero?

Ahora, el verbo ser.

Yo soy. Tú eres. Él es. Ella es. Nosotros somos.

Yo soy María. Tú eres Carlos. Él es doctor. Ella es enfermera.

¿Quién eres? Yo soy José.
Mucho gusto, José. Yo soy María.
Mucho gusto, María.

¿Cómo eres? Soy alto. Soy bajita.

Yo soy inteligente. Tú eres amable. Él es fuerte. Ella es hermosa.

Soy. Eres. Es. Somos.`,

  'First Verbs & Daily Actions': `Todos los días.

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

  'Family & Relationships': `Mi familia.

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

  'Common Nouns & Places': `La casa.

Yo vivo en una casa grande. Mi casa tiene tres dormitorios.

Hay una cocina. Hay un comedor. Hay una sala.

En la cocina.

Hay pan en la mesa. Hay agua en la botella. Hay café en la taza.

Como carne, fruta, verdura, pan cada día.

El tiempo.

Hoy es un día hermoso. El día es soleado. El tiempo es bueno.

Por la mañana, desayuno. Como pan y café.

Al mediodía, como carne y verdura.

Por la tarde, como fruta.

Por la noche, como pan y queso.

¿Hay agua? Sí, hay agua.

¿Hay leche? Sí, hay leche.

¿Qué hay en la casa? Hay muebles, hay ropa, hay comida.

Cada día es igual. Cada día, como, trabajo, duermo.`,

  'Adjectives & Descriptions': `Las descripciones.

El tiempo es bueno. El tiempo es malo. El día es hermoso.

Mi casa es grande. Tu casa es pequeña. Su casa es nueva.

Mi coche es nuevo. Tu coche es viejo. Su coche es bonito.

Los colores.

El coche es rojo. La casa es blanca. El árbol es verde.

Las personas.

Él es alto. Ella es bajita.

Él es joven. Ella es vieja.

Él es guapo. Ella es hermosa.

Él es fuerte. Ella es débil.

Él es inteligente. Ella es estudiosa.

La comida.

El pan es bueno. La fruta es buena. El agua es buena.

El café es caliente. El hielo es frío.

El pan es nuevo. El pan viejo no es bueno.

La ropa.

La camisa es roja. El pantalón es azul. El vestido es hermoso.

La casa es grande, bonita, y nueva. La casa es muy agradable.`,

  'Consolidation & Review': `Hola, me llamo Santiago. Te cuento mi historia.

Mi familia es pequeña. Mi padre es ingeniero. Mi madre es doctora. Tengo un hermano y una hermana.

Yo vivo en una casa grande en Madrid. Mi casa tiene cuatro dormitorios.

Cada día, me despierto por la mañana. Desayuno pan y café. Es bueno. Es caliente.

Voy al trabajo. Trabajo en una oficina grande. Hablo con mis amigos. Hacemos proyectos interesantes.

Al mediodía, como carne y verdura. Después, trabajo más.

Mi hermano vive en Barcelona. Él es abogado. Es muy inteligente. Es joven, pero trabaja mucho.

Mi hermana vive con nosotros. Ella es enfermera. Trabaja en un hospital. Es amable y bonita.

Por la tarde, vuelvo a casa. Descanso. Hablo con mi familia.

Mi abuelo vive con nosotros. Él es jubilado. Se casó con mi abuela hace sesenta años. Se quieren mucho.

Por la noche, cenamos juntos. Comemos pollo, verdura, y pan. Después, miramos la televisión. Hablamos de nuestros días.

Antes de dormir, leo un libro. Es un libro bueno. Es nuevo.

Duermo bien. El día termina.

Cada día es igual, pero diferente. Cada día tiene sorpresas. Cada día tengo tiempo con mi familia.

Mi vida es buena. Soy feliz. Tengo todo lo que necesito.`,
};

export function getAudioScript(lessonTitle: string): string | null {
  return audioScripts[lessonTitle] || null;
}
