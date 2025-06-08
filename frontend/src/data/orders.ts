// Active group orders
export const activeGroupOrders = Array(3)
  .fill(null)
  .map((_, index) => ({
    id: index + 1,
    imageUrl:
      "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    leaderName: "arash",
  }));

// Preparing orders
export const preparingOrders = [
  {
    id: 1,
    orderCode: "234234 ",
    date: "30 مهر 1403",
    status: "در حال آماده سازی",
    items: [
      {
        id: 1,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 130000,
      },
      {
        id: 2,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 80000,
      },
    ],
  },
  {
    id: 2,
    orderCode: "234234 ",
    date: "30 مهر 1403",
    status: "در حال آماده سازی",
    items: [
      {
        id: 1,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 130000,
      },
      {
        id: 2,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 80000,
      },
    ],
  },
  {
    id: 3,
    orderCode: "234234 ",
    date: "30 مهر 1403",
    status: "در حال آماده سازی",
    items: [
      {
        id: 1,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 130000,
      },
      
    ],
  },
];

// Sent orders
export const sentOrders = [];

// Delivered orders
export const deliveredOrders = [
  {
    id: 1,
    orderCode: "123456",
    date: "30 مهر 1403",
    status: "تحویل داده شده",
    items: [
      {
        id: 1,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 130000,
      },
      {
        id: 2,
        imageUrl: "https://atticbv.com/media/products/images/None/photo_5765121115679737611_y_1.jpg",
        price: 80000,
      },
    ],
  },
];

// Returned orders
export const returnedOrders = [];

// Cancelled orders
export const cancelledOrders = [];

// Order counts
export const orderCounts = {
  activeGroup: activeGroupOrders.length,
  preparing: preparingOrders.length,
  sent: sentOrders.length,
  delivered: deliveredOrders.length,
  returned: returnedOrders.length,
  cancelled: cancelledOrders.length,
};
