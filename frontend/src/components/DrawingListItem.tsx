import React from 'react';
import { Link } from 'react-router-dom';

interface Drawing {
  id: number;
  title: string;
}

interface DrawingListItemProps {
  drawing: Drawing;
}

const DrawingListItem: React.FC<DrawingListItemProps> = ({ drawing }) => {
  return (
    <li key={drawing.id} className="bg-clay-white shadow-md rounded-lg hover:bg-light-cave-ochre cursor-pointer group transition-colors duration-300">
      <Link to={`/drawings/${drawing.id}`} className="block w-full h-full p-6">
        <span className="text-xl font-semibold text-cave-ochre group-hover:text-clay-white">
          {drawing.title || `無題の描画ボード (${drawing.id})`}
        </span>
      </Link>
    </li>
  );
};

export default DrawingListItem;
