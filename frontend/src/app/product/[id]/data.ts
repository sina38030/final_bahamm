interface ProductImage {
    id: number;
    src: string;
    alt: string;
}

export const productImages: ProductImage[] = [
    {
        id: 1,
        src: 'https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png',
        alt: 'شامپو تقویت کننده مو - نمای اصلی'
    },
    {
        id: 2,
        src: 'https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png',
        alt: 'شامپو تقویت کننده مو - نمای جانبی'
    },
    {
        id: 3,
        src: 'https://media.licdn.com/media/AAYABATPAAgAAQAAAAAAAKwYrfHUPkoBQGmwnaG71Ps_5Q.png ',
        alt: 'شامپو تقویت کننده مو - جزئیات'
    }
]; 