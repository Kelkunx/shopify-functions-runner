export type FunctionType =
  | "product-discount"
  | "delivery-customization"
  | "cart-transform";

export interface FunctionTemplate {
  id: string;
  label: string;
  functionType: FunctionType;
  input: Record<string, unknown>;
}

export const functionTypes: { value: FunctionType; label: string }[] = [
  { value: "product-discount", label: "Product discount" },
  { value: "delivery-customization", label: "Delivery customization" },
  { value: "cart-transform", label: "Cart transform" },
];

export const functionTemplates: FunctionTemplate[] = [
  {
    id: "product-basic",
    label: "Basic discount cart",
    functionType: "product-discount",
    input: {
      discountNode: {
        metafield: {
          value: JSON.stringify({
            percentage: 10,
          }),
        },
      },
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 2,
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              product: {
                id: "gid://shopify/Product/1",
              },
            },
          },
        ],
      },
    },
  },
  {
    id: "product-large-cart",
    label: "Large cart discount",
    functionType: "product-discount",
    input: {
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 5,
          },
          {
            id: "gid://shopify/CartLine/2",
            quantity: 3,
          },
        ],
      },
      discountNode: {
        metafield: {
          value: JSON.stringify({
            percentage: 15,
          }),
        },
      },
    },
  },
  {
    id: "delivery-standard",
    label: "Delivery options",
    functionType: "delivery-customization",
    input: {
      cart: {
        deliveryGroups: [
          {
            id: "gid://shopify/CartDeliveryGroup/1",
            deliveryOptions: [
              {
                handle: "standard",
                title: "Standard shipping",
              },
              {
                handle: "express",
                title: "Express shipping",
              },
            ],
          },
        ],
      },
    },
  },
  {
    id: "cart-transform-bundle",
    label: "Bundle transform",
    functionType: "cart-transform",
    input: {
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 1,
            merchandise: {
              id: "gid://shopify/ProductVariant/11",
            },
          },
        ],
      },
    },
  },
];

export function getTemplatesForType(functionType: FunctionType) {
  return functionTemplates.filter((template) => template.functionType === functionType);
}

export function formatTemplateInput(input: Record<string, unknown>) {
  return JSON.stringify(input, null, 2);
}
