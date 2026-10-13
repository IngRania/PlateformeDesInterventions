import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import TechnicianLocation

GROUP_NAME = 'technicians_tracking'


class LocationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close()
            return

        # Les clients n'ont pas accès au suivi des techniciens.
        if user.role not in ('TECHNICIEN', 'RESPONSABLE', 'ADMIN'):
            await self.close()
            return

        self.user = user
        # Seuls les responsables/admins reçoivent les positions ; le technicien ne fait qu'émettre.
        self.listening = user.role in ('RESPONSABLE', 'ADMIN')
        if self.listening:
            await self.channel_layer.group_add(GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if getattr(self, 'listening', False):
            await self.channel_layer.group_discard(GROUP_NAME, self.channel_name)

    async def receive(self, text_data):
        """
        Reçu uniquement du côté technicien (LocationSender.tsx) :
        { "latitude": ..., "longitude": ... }
        """
        if self.user.role != 'TECHNICIEN':
            return

        try:
            data = json.loads(text_data)
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            return
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return

        location = await self.save_location(latitude, longitude)

        # Diffuse la nouvelle position à tous les clients connectés (dont TechniciansMap.tsx)
        await self.channel_layer.group_send(
            GROUP_NAME,
            {
                'type': 'location_update',
                'technicien_id': self.user.id,
                'technicien_nom': self.user.full_name,
                'latitude': latitude,
                'longitude': longitude,
            }
        )

    async def location_update(self, event):
        await self.send(text_data=json.dumps({
            'technicien_id': event['technicien_id'],
            'technicien_nom': event['technicien_nom'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
        }))

    @database_sync_to_async
    def save_location(self, latitude, longitude):
        location, _ = TechnicianLocation.objects.update_or_create(
            technicien=self.user,
            defaults={'latitude': latitude, 'longitude': longitude},
        )
        return location