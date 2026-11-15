import React from 'react';
import { renderToString } from 'react-dom/server';

export function render(Component, props) {
  return renderToString(React.createElement(Component, props));
}
