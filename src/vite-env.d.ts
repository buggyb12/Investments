/// <reference types="vite/client" />

declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*?worker" {
  const Worker: { new (options?: { name?: string }): Worker };
  export default Worker;
}
