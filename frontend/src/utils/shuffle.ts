export function shuffle(new_array) {
    console.log('[DEBUG] Shuffle called with array:', new_array?.length ? `${new_array.length} items` : 'empty array', 
                new_array?.length > 0 ? `(first item: ${JSON.stringify(new_array[0]?.id || new_array[0])})` : '');
    
    if (!new_array || !Array.isArray(new_array)) {
        console.warn('[DEBUG] Shuffle received non-array input:', new_array);
        return [];
    }
    
    const array = [...new_array]
    let currentIndex = array.length;

    while (currentIndex != 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex); // Changed 'let' to 'const'
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }
    
    console.log('[DEBUG] Shuffle returning array:', array?.length ? `${array.length} items` : 'empty array');
    return array
}