from __future__ import annotations

import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from conocimiento.models import FragmentoDocumental, FuenteDocumental


class ImportarDatasetTurismoTests(TestCase):
    def setUp(self) -> None:
        self.temporal = tempfile.TemporaryDirectory()
        self.csv_path = Path(self.temporal.name) / "tourism.csv"
        self.csv_path.write_text(
            "Location,Country,Category,Visitors,Rating,Revenue,Accommodation_Available\n"
            "Lugar A,Bolivia,Cultural,1000,4.5,12000,Yes\n"
            "Lugar B,Peru,Natural,500,4.1,3000,No\n",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temporal.cleanup()

    def test_importa_filas_como_fragmentos_sin_atractivo_y_es_idempotente(self):
        call_command("importar_dataset_turismo", csv=str(self.csv_path))

        fuente = FuenteDocumental.objects.get(url="dataset://tourism_dataset.csv")
        self.assertEqual(fuente.tipo, "dataset")
        self.assertIsNone(fuente.atractivo)
        self.assertEqual(fuente.estado_scraping, FuenteDocumental.ESTADO_COMPLETADO)
        self.assertEqual(FragmentoDocumental.objects.filter(fuente=fuente).count(), 2)
        self.assertIn("Ubicación declarada: Lugar A.", fuente.fragmentos.get(numero_fragmento=0).contenido)

        call_command("importar_dataset_turismo", csv=str(self.csv_path))

        self.assertEqual(FuenteDocumental.objects.count(), 1)
        self.assertEqual(FragmentoDocumental.objects.filter(fuente=fuente).count(), 2)

    def test_rechaza_csv_sin_columnas_requeridas(self):
        self.csv_path.write_text("Location,Country\nLugar A,Bolivia\n", encoding="utf-8")

        with self.assertRaisesMessage(
            Exception, "El CSV no contiene las columnas requeridas"
        ):
            call_command("importar_dataset_turismo", csv=str(self.csv_path))
