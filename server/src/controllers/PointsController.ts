import { Request, Response } from 'express';
import knex from '../database/conextion';

class PointsController {

  async index(req: Request, rep: Response) {
    const { city, uf, items } = req.query;

    const parsedItems = String(items).split(',').map(item => Number(item.trim()));

    console.log(parsedItems);

    const points = await knex('points')
      .join('point_items', 'points.id', '=', 'point_items.point_id')
      .whereIn('point_items.items_id', parsedItems)
      .where('city', String(city))
      .where('uf', String(uf))
      .distinct()
      .select('points.*');

    const serializedPoints = points.map(point => {
      return {
        ...points,
        image_url: `http://192.168.0.24:3333/uploads/${point.image}`,
      }
    });

    return rep.json(serializedPoints);
  }

  async show(req: Request, rep: Response) {
    const { id } = req.params;

    const point = await knex('points').where('id', id).first();

    if (!point) {
      return rep.status(400).json({ message: 'Point not found' });
    }

    const serializedPoint = {
      ...point,
      image_url: `http://192.168.0.24:3333/uploads/${point.image}`,
    };

    const items = await knex('items')
      .join('point_items', 'items.id', '=', 'point_items.items_id')
      .where('point_items.point_id', id)
      .select('items.title');

    return rep.json({ serializedPoint, items });
  }

  async create(req: Request, rep: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items
    } = req.body;

    const trx = await knex.transaction();

    const point = {
      image: req.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf
    };

    const insertedIds = await trx('points').insert(point);

    const point_id = insertedIds[0];

    const pointItems = items.
      split(',')
      .map((item: string) => Number(item.trim()))
      .map((items_id: number) => {
        return {
          items_id,
          point_id,
        }
      })

    await trx('point_items').insert(pointItems);

    await trx.commit();

    return rep.json({
      id: point_id,
      ...point,
    });
  }

}

export default PointsController;