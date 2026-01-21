type Listener<T> = (state: T) => void;

interface Store<T> {
  getState(): T;
  setState(newState: Partial<T>): void;
  subscribe(listener: Listener<T>): () => void;
}

function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners: Listener<T>[] = [];

  return {
    getState() {
      return state;
    },
    setState(newState: Partial<T>) {
      state = { ...state, ...newState };
      listeners.forEach(listener => listener(state));
    },
    subscribe(listener: Listener<T>) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }
  };
}
